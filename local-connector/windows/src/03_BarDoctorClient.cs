using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;

namespace BarDoctor.LocalConnector
{
    internal sealed class BarDoctorClient
    {
        private readonly ConnectorSettings _settings;

        public BarDoctorClient(ConnectorSettings settings)
        {
            _settings = settings;
        }

        public ServerConnectionInfo CheckConnection()
        {
            Dictionary<string, object> body = Request("GET", "/api/integration/v1/health", null);
            if (!BooleanValue(body, "ok")) throw ApiError(body, false);
            ServerConnectionInfo result = new ServerConnectionInfo();
            result.ConnectionId = JsonUtil.Text(body, "connectionId");
            Dictionary<string, object> venue = Child(body, "venue");
            Dictionary<string, object> source = Child(body, "source");
            Dictionary<string, object> limits = Child(body, "limits");
            result.VenueName = JsonUtil.Text(venue, "name");
            result.SourceName = JsonUtil.Text(source, "name");
            result.MaxRecords = Math.Max(1, JsonUtil.Integer(limits, "maxRecordsPerDelivery"));
            result.Cursor = Child(body, "cursor");
            if (String.IsNullOrWhiteSpace(result.ConnectionId))
                throw new ConnectorException("CONNECTION_INVALID", "BarDoctor не вернул идентификатор подключения.", false);
            return result;
        }

        public void Heartbeat(ConnectorSettings settings, string status, string platformVersion,
            string configurationName, string configurationVersion, string lastEntityType,
            int importedCount, string lastError, DateTime? lastSyncUtc)
        {
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["connectionId"] = settings.ConnectionId;
            payload["machineIdHash"] = HashUtil.MachineIdHash();
            payload["machineName"] = Environment.MachineName;
            payload["agentVersion"] = ConnectorConstants.Version;
            payload["operatingSystem"] = Environment.OSVersion.VersionString;
            payload["adapterKey"] = ConnectorConstants.OneCAdapterKey;
            payload["platformVersion"] = platformVersion ?? "";
            payload["configurationName"] = configurationName ?? "";
            payload["configurationVersion"] = configurationVersion ?? "";
            payload["infobaseName"] = settings.InfoBaseName ?? "";
            payload["readOnly"] = true;
            payload["status"] = status;
            payload["autoSync"] = settings.AutoSync;
            payload["intervalMinutes"] = settings.IntervalMinutes;
            payload["lastEntityType"] = lastEntityType ?? "";
            payload["importedCount"] = importedCount;
            payload["lastError"] = lastError ?? "";
            if (lastSyncUtc.HasValue) payload["lastSyncAt"] = lastSyncUtc.Value.ToString("o");
            payload["metadata"] = new Dictionary<string, object>
            {
                { "queueDepth", new EncryptedQueue().Count() },
                { "architecture", "x86" },
                { "readStrategy", "COM SELECT queries only" }
            };
            Dictionary<string, object> result = Request("POST", "/api/integration/v1/heartbeat", JsonUtil.Serialize(payload));
            if (!BooleanValue(result, "ok")) throw ApiError(result, false);
        }

        public DeliveryResult Send(string payloadJson)
        {
            Dictionary<string, object> body = Request("POST", "/api/integration/v1/ingest", payloadJson);
            if (!BooleanValue(body, "ok")) throw ApiError(body, true);
            DeliveryResult result = new DeliveryResult();
            result.Accepted = true;
            result.Duplicate = BooleanValue(body, "duplicate");
            Dictionary<string, object> run = Child(body, "run");
            result.RunStatus = JsonUtil.Text(run, "status");
            result.Received = JsonUtil.Integer(run, "received");
            result.Created = JsonUtil.Integer(run, "created");
            result.Updated = JsonUtil.Integer(run, "updated");
            result.Skipped = JsonUtil.Integer(run, "skipped");
            object errors;
            object[] errorList = run.TryGetValue("errors", out errors) ? errors as object[] : null;
            ICollection errorCollection = errors as ICollection;
            result.Errors = errorList != null ? errorList.Length : errorCollection == null ? 0 : errorCollection.Count;
            return result;
        }

        private Dictionary<string, object> Request(string method, string path, string json)
        {
            Uri endpoint = Endpoint(path);
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(endpoint);
            request.Method = method;
            request.Timeout = 45000;
            request.ReadWriteTimeout = 45000;
            request.Accept = "application/json";
            request.UserAgent = "BarDoctor-Local-Connector/" + ConnectorConstants.Version;
            request.Headers[HttpRequestHeader.Authorization] = "Bearer " + (_settings.AccessKey ?? "");
            if (json != null)
            {
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                request.ContentType = "application/json; charset=utf-8";
                request.ContentLength = bytes.Length;
                using (Stream stream = request.GetRequestStream()) stream.Write(bytes, 0, bytes.Length);
            }
            try
            {
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                    return JsonUtil.Deserialize<Dictionary<string, object>>(reader.ReadToEnd());
            }
            catch (WebException error)
            {
                HttpWebResponse response = error.Response as HttpWebResponse;
                string responseBody = "";
                if (response != null && response.GetResponseStream() != null)
                    using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8)) responseBody = reader.ReadToEnd();
                Dictionary<string, object> parsed = null;
                try { parsed = JsonUtil.Deserialize<Dictionary<string, object>>(responseBody); } catch { }
                if (parsed != null) throw ApiError(parsed, response == null || (int)response.StatusCode >= 500 || (int)response.StatusCode == 409);
                if (response == null) throw new ConnectorException("NETWORK_UNAVAILABLE", "Нет связи с BarDoctor. Данные сохранены и будут отправлены после восстановления интернета.", true);
                throw new ConnectorException("HTTP_" + (int)response.StatusCode, "BarDoctor временно не принял данные. Повтор будет выполнен автоматически.", (int)response.StatusCode >= 500);
            }
        }

        private Uri Endpoint(string path)
        {
            Uri server;
            if (!Uri.TryCreate((_settings.ServerUrl ?? "").Trim().TrimEnd('/') + "/", UriKind.Absolute, out server))
                throw new ConnectorException("SERVER_URL_INVALID", "Некорректный адрес сервера BarDoctor.", false);
            bool loopback = server.IsLoopback;
            if (!String.Equals(server.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) && !loopback)
                throw new ConnectorException("TLS_REQUIRED", "BarDoctor Local Connector передаёт данные только по защищённому HTTPS-соединению.", false);
            return new Uri(server, path.TrimStart('/'));
        }

        private static Dictionary<string, object> Child(Dictionary<string, object> value, string key)
        {
            object item;
            Dictionary<string, object> result;
            return value != null && value.TryGetValue(key, out item) && (result = item as Dictionary<string, object>) != null
                ? result
                : new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        }

        private static bool BooleanValue(Dictionary<string, object> value, string key)
        {
            object item;
            return value != null && value.TryGetValue(key, out item) && item is bool && (bool)item;
        }

        private static ConnectorException ApiError(Dictionary<string, object> value, bool defaultRetryable)
        {
            string code = JsonUtil.Text(value, "code");
            string message = JsonUtil.Text(value, "error");
            if (code == "INVALID_INTEGRATION_TOKEN")
                message = "Ключ BarDoctor недействителен или отозван. Выпустите новый ключ в разделе интеграций и вставьте его в первый экран мастера.";
            if (String.IsNullOrWhiteSpace(message)) message = "BarDoctor отклонил запрос.";
            bool retryable = defaultRetryable && code != "INVALID_INTEGRATION_TOKEN"
                && code != "CONNECTION_MISMATCH" && code != "SCOPE_DENIED"
                && code != "CONTRACT_INVALID" && code != "INGEST_FAILED"
                && code != "RECORD_COUNT_INVALID" && code != "WAREHOUSE_SCOPE_DENIED";
            return new ConnectorException(String.IsNullOrWhiteSpace(code) ? "API_ERROR" : code, message, retryable);
        }
    }
}
