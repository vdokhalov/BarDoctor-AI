using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;

namespace BarDoctor.LocalConnector
{
    internal static class ConnectorPaths
    {
        public static readonly string Root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BarDoctor", "LocalConnector");
        public static readonly string Queue = Path.Combine(Root, "queue");
        public static readonly string Settings = Path.Combine(Root, "settings.dat");
        public static readonly string Log = Path.Combine(Root, "connector.log");

        public static void Ensure()
        {
            Directory.CreateDirectory(Root);
            Directory.CreateDirectory(Queue);
        }
    }

    internal static class HashUtil
    {
        public static string Sha256(string value)
        {
            using (SHA256 hash = SHA256.Create())
            {
                byte[] bytes = hash.ComputeHash(Encoding.UTF8.GetBytes(value ?? ""));
                StringBuilder result = new StringBuilder(bytes.Length * 2);
                foreach (byte item in bytes) result.Append(item.ToString("x2", CultureInfo.InvariantCulture));
                return result.ToString();
            }
        }

        public static string MachineIdHash()
        {
            string machineGuid = "";
            try
            {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey("SOFTWARE\\Microsoft\\Cryptography"))
                {
                    machineGuid = Convert.ToString(key == null ? null : key.GetValue("MachineGuid"));
                }
            }
            catch { }
            string sid = WindowsIdentity.GetCurrent() == null || WindowsIdentity.GetCurrent().User == null
                ? Environment.UserName
                : WindowsIdentity.GetCurrent().User.Value;
            return Sha256(machineGuid + "|" + sid + "|BarDoctor.LocalConnector");
        }
    }

    internal static class SecretProtector
    {
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("BarDoctor.LocalConnector.settings.v1");

        public static byte[] Protect(string value)
        {
            return ProtectedData.Protect(Encoding.UTF8.GetBytes(value ?? ""), Entropy, DataProtectionScope.CurrentUser);
        }

        public static string Unprotect(byte[] value)
        {
            return Encoding.UTF8.GetString(ProtectedData.Unprotect(value, Entropy, DataProtectionScope.CurrentUser));
        }
    }

    internal sealed class SettingsStore
    {
        private static readonly object Gate = new object();
        public ConnectorSettings Load()
        {
            ConnectorPaths.Ensure();
            if (!File.Exists(ConnectorPaths.Settings)) return new ConnectorSettings();
            try
            {
                ConnectorSettings value = JsonUtil.Deserialize<ConnectorSettings>(
                    SecretProtector.Unprotect(File.ReadAllBytes(ConnectorPaths.Settings)));
                if (value == null) return new ConnectorSettings();
                if (value.Cursors == null) value.Cursors = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                if (value.Fingerprints == null) value.Fingerprints = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                if (value.StockState == null) value.StockState = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                if (String.IsNullOrWhiteSpace(value.ServerUrl)) value.ServerUrl = ConnectorConstants.ProductionServer;
                if (value.IntervalMinutes < 15) value.IntervalMinutes = 60;
                if (value.InitialSyncDays < 1) value.InitialSyncDays = 365;
                return value;
            }
            catch (Exception error)
            {
                ConnectorLog.Error("Settings could not be decrypted", error);
                return new ConnectorSettings();
            }
        }

        public void Save(ConnectorSettings value)
        {
            lock (Gate)
            {
                ConnectorPaths.Ensure();
                string temporary = ConnectorPaths.Settings + ".tmp";
                File.WriteAllBytes(temporary, SecretProtector.Protect(JsonUtil.Serialize(value)));
                if (File.Exists(ConnectorPaths.Settings)) File.Replace(temporary, ConnectorPaths.Settings, null);
                else File.Move(temporary, ConnectorPaths.Settings);
            }
        }
    }

    internal static class ConnectorLog
    {
        private static readonly object Gate = new object();

        public static void Info(string message)
        {
            Write("INFO", message, null);
        }

        public static void Error(string message, Exception error)
        {
            Write("ERROR", message, error);
        }

        private static void Write(string level, string message, Exception error)
        {
            try
            {
                ConnectorPaths.Ensure();
                string detail = Redact(message);
                if (error != null) detail += " | " + Redact(error.GetType().Name + ": " + error.Message);
                string line = DateTime.UtcNow.ToString("u", CultureInfo.InvariantCulture) + " " + level + " " + detail;
                lock (Gate) File.AppendAllText(ConnectorPaths.Log, line + Environment.NewLine, Encoding.UTF8);
            }
            catch { }
        }

        private static string Redact(string value)
        {
            if (String.IsNullOrEmpty(value)) return "";
            string result = value;
            result = Regex.Replace(
                result,
                "(?i)(Pwd|Password|Пароль)\\s*=\\s*\"[^\"]*\"",
                "$1=\"[REDACTED_PASSWORD]\"");
            int token = result.IndexOf("bd_local_", StringComparison.OrdinalIgnoreCase);
            while (token >= 0)
            {
                int end = token;
                while (end < result.Length && !Char.IsWhiteSpace(result[end]) && result[end] != '"') end++;
                result = result.Substring(0, token) + "[REDACTED_KEY]" + result.Substring(end);
                token = result.IndexOf("bd_local_", token + 14, StringComparison.OrdinalIgnoreCase);
            }
            return result.Length > 4000 ? result.Substring(0, 4000) : result;
        }
    }

    internal sealed class EncryptedQueue
    {
        public QueueItem Enqueue(QueueItem item)
        {
            ConnectorPaths.Ensure();
            if (Directory.GetFiles(ConnectorPaths.Queue, "*.bdq").Length >= 10000)
                throw new InvalidOperationException("Локальная очередь заполнена. Проверьте интернет и ключ подключения.");
            if (String.IsNullOrWhiteSpace(item.Id)) item.Id = Guid.NewGuid().ToString("N");
            string path = Path.Combine(ConnectorPaths.Queue, item.CreatedUtc.Ticks.ToString("D19") + "-" + item.Id + ".bdq");
            File.WriteAllBytes(path, SecretProtector.Protect(JsonUtil.Serialize(item)));
            return item;
        }

        public List<Tuple<string, QueueItem>> Ready(bool includeDelayed)
        {
            ConnectorPaths.Ensure();
            List<Tuple<string, QueueItem>> result = new List<Tuple<string, QueueItem>>();
            foreach (string file in Directory.GetFiles(ConnectorPaths.Queue, "*.bdq").OrderBy(delegate(string path) { return path; }))
            {
                try
                {
                    QueueItem item = JsonUtil.Deserialize<QueueItem>(SecretProtector.Unprotect(File.ReadAllBytes(file)));
                    if (item != null && (includeDelayed || item.NextAttemptUtc <= DateTime.UtcNow)) result.Add(Tuple.Create(file, item));
                }
                catch (Exception error)
                {
                    ConnectorLog.Error("Queue item is unreadable", error);
                    string quarantine = file + ".invalid";
                    if (!File.Exists(quarantine)) File.Move(file, quarantine);
                }
            }
            return result;
        }

        public int Count()
        {
            ConnectorPaths.Ensure();
            return Directory.GetFiles(ConnectorPaths.Queue, "*.bdq").Length;
        }

        public void Complete(string path)
        {
            if (File.Exists(path)) File.Delete(path);
        }

        public void Retry(string path, QueueItem item)
        {
            item.Attempts++;
            int exponent = Math.Min(item.Attempts, 8);
            int seconds = Math.Min(900, (int)Math.Pow(2, exponent) * 5);
            int jitter = (int)(Math.Abs((long)item.DeliveryId.GetHashCode()) % 11L);
            item.NextAttemptUtc = DateTime.UtcNow.AddSeconds(seconds + jitter);
            File.WriteAllBytes(path, SecretProtector.Protect(JsonUtil.Serialize(item)));
            ConnectorLog.Info("Queue retry delivery=" + item.DeliveryId + " attempt=" + item.Attempts
                + " next=" + item.NextAttemptUtc.ToString("o", CultureInfo.InvariantCulture));
        }
    }

    internal sealed class ConnectorException : Exception
    {
        public string Code { get; private set; }
        public bool Retryable { get; private set; }

        public ConnectorException(string code, string message, bool retryable)
            : base(message)
        {
            Code = code;
            Retryable = retryable;
        }
    }

    internal static class FriendlyError
    {
        public static string Message(Exception error)
        {
            ConnectorException known = error as ConnectorException;
            if (known != null) return known.Message;
            string text = error == null ? "" : error.Message;
            if (text.IndexOf("80004005", StringComparison.OrdinalIgnoreCase) >= 0
                || text.IndexOf("открыт", StringComparison.OrdinalIgnoreCase) >= 0)
                return "BarDoctor не смог открыть базу 1С. Проверьте путь, пользователя и пароль.";
            if (text.IndexOf("class not registered", StringComparison.OrdinalIgnoreCase) >= 0
                || text.IndexOf("80040154", StringComparison.OrdinalIgnoreCase) >= 0)
                return "Компонент COM-соединения 1С не зарегистрирован. Переустановите платформу 1С 8.2 с компонентом COM-соединения.";
            if (text.IndexOf("license", StringComparison.OrdinalIgnoreCase) >= 0
                || text.IndexOf("лиценз", StringComparison.OrdinalIgnoreCase) >= 0)
                return "1С не выдала лицензию для внешнего соединения. Закройте лишние сеансы и повторите проверку.";
            return String.IsNullOrWhiteSpace(text) ? "Операция не выполнена. Откройте технические детали в журнале." : text;
        }
    }
}
