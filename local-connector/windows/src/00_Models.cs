using System;
using System.Collections.Generic;
using System.Web.Script.Serialization;

namespace BarDoctor.LocalConnector
{
    internal static class ConnectorConstants
    {
        public const string Version = "1.1.0";
        public const string ProductionServer = "https://bardoctor-preview.v-dokhalov.chatgpt.site";
        public const string OneCAdapterKey = "onec-common-catering-v1";
        public static readonly string[] EntityOrder = new[]
        {
            "product", "supplier", "warehouse", "purchase_document", "stock_balance"
        };
    }

    [Serializable]
    internal sealed class ConnectorSettings
    {
        public string ServerUrl { get; set; }
        public string AccessKey { get; set; }
        public string ConnectionId { get; set; }
        public string VenueName { get; set; }
        public string SourceName { get; set; }
        public string InfoBaseName { get; set; }
        public string InfoBasePath { get; set; }
        public string OneCUser { get; set; }
        public string OneCPassword { get; set; }
        public bool AutoSync { get; set; }
        public int IntervalMinutes { get; set; }
        public int InitialSyncDays { get; set; }
        public int ImportedCount { get; set; }
        public bool ProductsEnabled { get; set; }
        public bool SuppliersEnabled { get; set; }
        public bool WarehousesEnabled { get; set; }
        public bool PurchasesEnabled { get; set; }
        public bool StockEnabled { get; set; }
        public Dictionary<string, string> Cursors { get; set; }
        public Dictionary<string, string> Fingerprints { get; set; }
        public Dictionary<string, string> StockState { get; set; }

        public ConnectorSettings()
        {
            ServerUrl = ConnectorConstants.ProductionServer;
            AccessKey = "";
            ConnectionId = "";
            VenueName = "";
            SourceName = "";
            InfoBaseName = "";
            InfoBasePath = "";
            OneCUser = "";
            OneCPassword = "";
            AutoSync = false;
            IntervalMinutes = 60;
            InitialSyncDays = 365;
            ImportedCount = 0;
            ProductsEnabled = true;
            SuppliersEnabled = true;
            WarehousesEnabled = true;
            PurchasesEnabled = true;
            StockEnabled = true;
            Cursors = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            Fingerprints = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            StockState = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        public bool IsEntityEnabled(string entityType)
        {
            if (entityType == "product") return ProductsEnabled;
            if (entityType == "supplier") return SuppliersEnabled;
            if (entityType == "warehouse") return WarehousesEnabled;
            if (entityType == "purchase_document") return PurchasesEnabled;
            if (entityType == "stock_balance") return StockEnabled;
            return false;
        }
    }

    internal sealed class PlatformInstallation
    {
        public string Version { get; set; }
        public string BinPath { get; set; }
        public string ProgId { get; set; }
        public bool ComAvailable { get; set; }

        public override string ToString()
        {
            return Version + (ComAvailable ? " · COM доступен" : " · COM не зарегистрирован");
        }
    }

    internal sealed class InfoBaseDescriptor
    {
        public string Name { get; set; }
        public string Path { get; set; }
        public string Version { get; set; }
        public string ConfigurationName { get; set; }
        public string ConfigurationVersion { get; set; }

        public override string ToString()
        {
            return String.IsNullOrWhiteSpace(Path) ? Name : Name + " · " + Path;
        }
    }

    internal sealed class OneCTestResult
    {
        public bool Ok { get; set; }
        public string PlatformVersion { get; set; }
        public string ConfigurationName { get; set; }
        public string ConfigurationVersion { get; set; }
        public string Profile { get; set; }
        public List<string> Warnings { get; set; }

        public OneCTestResult()
        {
            Warnings = new List<string>();
        }
    }

    internal sealed class AdapterReadResult
    {
        public string EntityType { get; set; }
        public List<Dictionary<string, object>> Records { get; set; }
        public Dictionary<string, string> Fingerprints { get; set; }
        public string NextCursor { get; set; }
        public List<string> Warnings { get; set; }

        public AdapterReadResult()
        {
            Records = new List<Dictionary<string, object>>();
            Fingerprints = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            Warnings = new List<string>();
        }
    }

    [Serializable]
    internal sealed class QueueItem
    {
        public string Id { get; set; }
        public string DeliveryId { get; set; }
        public string EntityType { get; set; }
        public string PayloadJson { get; set; }
        public string Cursor { get; set; }
        public Dictionary<string, string> Fingerprints { get; set; }
        public int Attempts { get; set; }
        public DateTime NextAttemptUtc { get; set; }
        public DateTime CreatedUtc { get; set; }

        public QueueItem()
        {
            Fingerprints = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            CreatedUtc = DateTime.UtcNow;
            NextAttemptUtc = DateTime.UtcNow;
        }
    }

    internal sealed class ServerConnectionInfo
    {
        public string ConnectionId { get; set; }
        public string VenueName { get; set; }
        public string SourceName { get; set; }
        public Dictionary<string, object> Cursor { get; set; }
        public int MaxRecords { get; set; }
    }

    internal sealed class DeliveryResult
    {
        public bool Accepted { get; set; }
        public bool Duplicate { get; set; }
        public string RunStatus { get; set; }
        public int Received { get; set; }
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }
        public int Errors { get; set; }
    }

    internal sealed class EntitySyncProgress
    {
        public string EntityType { get; set; }
        public int Current { get; set; }
        public int Total { get; set; }
        public string State { get; set; }
        public string Message { get; set; }
    }

    internal sealed class SyncSummary
    {
        public int Received { get; set; }
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }
        public int Errors { get; set; }
        public List<string> Messages { get; set; }

        public SyncSummary()
        {
            Messages = new List<string>();
        }
    }

    internal static class JsonUtil
    {
        private static JavaScriptSerializer Create()
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            serializer.MaxJsonLength = 16 * 1024 * 1024;
            serializer.RecursionLimit = 100;
            return serializer;
        }

        public static string Serialize(object value)
        {
            return Create().Serialize(value);
        }

        public static T Deserialize<T>(string value)
        {
            return Create().Deserialize<T>(value);
        }

        public static Dictionary<string, object> Record(object value)
        {
            Dictionary<string, object> record = value as Dictionary<string, object>;
            return record ?? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        }

        public static string Text(Dictionary<string, object> value, string key)
        {
            object item;
            return value != null && value.TryGetValue(key, out item) && item != null
                ? Convert.ToString(item)
                : "";
        }

        public static int Integer(Dictionary<string, object> value, string key)
        {
            object item;
            int result;
            return value != null && value.TryGetValue(key, out item)
                && Int32.TryParse(Convert.ToString(item), out result) ? result : 0;
        }
    }
}
