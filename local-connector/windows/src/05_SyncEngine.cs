using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;

namespace BarDoctor.LocalConnector
{
    internal sealed class ConnectorRuntime : IDisposable
    {
        private readonly SettingsStore _store;
        private readonly EncryptedQueue _queue;
        private readonly object _syncGate;
        private readonly object _queueGate;
        private Timer _heartbeatTimer;
        private Timer _automaticTimer;
        private bool _syncing;
        private DateTime _lastAutomaticUtc;
        private string _lastPlatform;
        private string _lastConfiguration;
        private string _lastConfigurationVersion;

        public event Action<EntitySyncProgress> ProgressChanged;
        public event Action<string> StateChanged;

        public ConnectorSettings Settings { get; private set; }
        public bool IsSyncing { get { lock (_syncGate) return _syncing; } }

        public ConnectorRuntime()
        {
            _store = new SettingsStore();
            _queue = new EncryptedQueue();
            _syncGate = new object();
            _queueGate = new object();
            Settings = _store.Load();
            _lastPlatform = "";
            _lastConfiguration = "";
            _lastConfigurationVersion = "";
            _lastAutomaticUtc = DateTime.MinValue;
            _heartbeatTimer = new Timer(delegate { RunSta(BackgroundHeartbeat); }, null, TimeSpan.FromSeconds(15), TimeSpan.FromMinutes(2));
            _automaticTimer = new Timer(delegate { RunSta(AutomaticTick); }, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
        }

        public void Save(ConnectorSettings settings)
        {
            if (settings == null) throw new ArgumentNullException("settings");
            settings.IntervalMinutes = Math.Max(15, Math.Min(1440, settings.IntervalMinutes));
            settings.InitialSyncDays = Math.Max(1, Math.Min(3650, settings.InitialSyncDays));
            Settings = settings;
            _store.Save(Settings);
            RaiseState("Настройки сохранены");
        }

        public ServerConnectionInfo CheckBarDoctor(ConnectorSettings settings)
        {
            BarDoctorClient client = new BarDoctorClient(settings);
            ServerConnectionInfo result = client.CheckConnection();
            settings.ConnectionId = result.ConnectionId;
            settings.VenueName = result.VenueName;
            settings.SourceName = result.SourceName;
            if (result.Cursor != null)
            {
                foreach (KeyValuePair<string, object> pair in result.Cursor)
                {
                    if (pair.Value != null && !settings.Cursors.ContainsKey(pair.Key))
                        settings.Cursors[pair.Key] = Convert.ToString(pair.Value, CultureInfo.InvariantCulture);
                }
            }
            Save(settings);
            client.Heartbeat(settings, "connected", _lastPlatform, _lastConfiguration,
                _lastConfigurationVersion, "", settings.ImportedCount, "", null);
            return result;
        }

        public List<PlatformInstallation> DiscoverPlatforms()
        {
            using (OneCAdapter adapter = new OneCAdapter()) return adapter.DiscoverPlatforms();
        }

        public List<InfoBaseDescriptor> DiscoverInfoBases()
        {
            using (OneCAdapter adapter = new OneCAdapter()) return adapter.DiscoverInfoBases();
        }

        public OneCTestResult TestOneC(ConnectorSettings settings)
        {
            using (OneCAdapter adapter = new OneCAdapter())
            {
                OneCTestResult result = adapter.Test(settings);
                _lastPlatform = result.PlatformVersion;
                _lastConfiguration = result.ConfigurationName;
                _lastConfigurationVersion = result.ConfigurationVersion;
                Save(settings);
                if (!String.IsNullOrWhiteSpace(settings.ConnectionId))
                {
                    new BarDoctorClient(settings).Heartbeat(settings, "connected", _lastPlatform,
                        _lastConfiguration, _lastConfigurationVersion, "", settings.ImportedCount, "", null);
                }
                return result;
            }
        }

        public SyncSummary SynchronizeNow()
        {
            lock (_syncGate)
            {
                if (_syncing) throw new ConnectorException("SYNC_ALREADY_RUNNING", "Синхронизация уже выполняется.", false);
                _syncing = true;
            }
            SyncSummary summary = new SyncSummary();
            string lastEntity = "";
            try
            {
                ValidateReady(Settings);
                BarDoctorClient client = new BarDoctorClient(Settings);
                ServerConnectionInfo server = client.CheckConnection();
                Settings.ConnectionId = server.ConnectionId;
                Settings.VenueName = server.VenueName;
                Settings.SourceName = server.SourceName;
                ConnectorLog.Info("Synchronization started venue=" + Settings.VenueName
                    + " source=" + Settings.SourceName + " queue=" + _queue.Count());
                client.Heartbeat(Settings, "syncing", _lastPlatform, _lastConfiguration,
                    _lastConfigurationVersion, "", 0, "", null);

                DrainQueue(client, summary, true);
                if (_queue.Count() > 0)
                    throw new ConnectorException("QUEUE_WAITING", "Не удалось отправить локальную очередь. Новые данные 1С пока не читаются, чтобы не заполнить диск.", true);

                using (OneCAdapter adapter = new OneCAdapter())
                {
                    adapter.Open(Settings);
                    _lastPlatform = adapter.PlatformVersion;
                    _lastConfiguration = adapter.ConfigurationName;
                    _lastConfigurationVersion = adapter.ConfigurationVersion;
                    foreach (string entityType in ConnectorConstants.EntityOrder)
                    {
                        lastEntity = entityType;
                        if (!Settings.IsEntityEnabled(entityType))
                        {
                            RaiseProgress(entityType, 0, 0, "disabled", "Отключено");
                            continue;
                        }
                        RaiseProgress(entityType, 0, 0, "reading", "Чтение из 1С…");
                        AdapterReadResult read = adapter.Read(entityType, Settings,
                            delegate(int current, string message) { RaiseProgress(entityType, current, 0, "reading", message); });
                        // Adapter-owned local state (for example, the last stock
                        // keys needed to emit real zero balances) is safe to
                        // persist before network acknowledgement. Cursors and
                        // fingerprints still advance only after acceptance.
                        _store.Save(Settings);
                        foreach (string warning in read.Warnings) summary.Messages.Add(EntityLabel(entityType) + ": " + warning);
                        List<Dictionary<string, object>> changed = ChangedRecords(read);
                        ConnectorLog.Info("Entity " + entityType + " read=" + read.Records.Count
                            + " changed=" + changed.Count + " cursor=" + (read.NextCursor ?? ""));
                        RaiseProgress(entityType, 0, changed.Count, changed.Count == 0 ? "complete" : "sending",
                            changed.Count == 0 ? "Изменений нет" : "Подготовлено к отправке");
                        if (changed.Count == 0)
                        {
                            if (!String.IsNullOrWhiteSpace(read.NextCursor)) Settings.Cursors[entityType] = read.NextCursor;
                            _store.Save(Settings);
                            continue;
                        }
                        SendBatches(client, server.MaxRecords, entityType, changed, read, summary);
                    }
                }
                _lastAutomaticUtc = DateTime.UtcNow;
                Settings.ImportedCount = Math.Max(0, Settings.ImportedCount + summary.Created + summary.Updated);
                _store.Save(Settings);
                string finalStatus = summary.Errors > 0 ? "attention" : "working";
                client.Heartbeat(Settings, finalStatus, _lastPlatform, _lastConfiguration,
                    _lastConfigurationVersion, lastEntity, Settings.ImportedCount,
                    summary.Errors > 0 ? String.Join("; ", summary.Messages.Take(3).ToArray()) : "", DateTime.UtcNow);
                RaiseState(summary.Errors > 0 ? "Синхронизация завершена с замечаниями" : "Синхронизация завершена");
                ConnectorLog.Info("Synchronization finished received=" + summary.Received
                    + " created=" + summary.Created + " updated=" + summary.Updated
                    + " skipped=" + summary.Skipped + " errors=" + summary.Errors);
                return summary;
            }
            catch (Exception error)
            {
                string friendly = FriendlyError.Message(error);
                summary.Errors++;
                summary.Messages.Add(friendly);
                ConnectorLog.Error("Synchronization failed at " + lastEntity, error);
                TryHeartbeat("error", lastEntity, friendly, null);
                RaiseState(friendly);
                throw;
            }
            finally
            {
                lock (_syncGate) _syncing = false;
            }
        }

        private List<Dictionary<string, object>> ChangedRecords(AdapterReadResult read)
        {
            List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
            foreach (Dictionary<string, object> record in read.Records)
            {
                string id = JsonUtil.Text(record, "externalId");
                string next;
                if (String.IsNullOrWhiteSpace(id) || !read.Fingerprints.TryGetValue(id, out next)) continue;
                string key = read.EntityType + ":" + id;
                string previous;
                if (!Settings.Fingerprints.TryGetValue(key, out previous) || !String.Equals(previous, next, StringComparison.Ordinal))
                    result.Add(record);
            }
            return result;
        }

        private void SendBatches(BarDoctorClient client, int serverLimit, string entityType,
            List<Dictionary<string, object>> records, AdapterReadResult read, SyncSummary summary)
        {
            int batchSize = Math.Max(1, Math.Min(250, serverLimit <= 0 ? 250 : serverLimit));
            int sent = 0;
            while (sent < records.Count)
            {
                List<Dictionary<string, object>> batch = records.Skip(sent).Take(batchSize).ToList();
                bool finalBatch = sent + batch.Count >= records.Count;
                QueueItem item = BuildQueueItem(entityType, batch, read, finalBatch);
                lock (_queueGate)
                {
                    _queue.Enqueue(item);
                    DrainQueue(client, summary, true);
                }
                if (_queue.Count() > 0)
                    throw new ConnectorException("NETWORK_UNAVAILABLE", "Интернет недоступен. Подготовленные данные сохранены локально и будут отправлены автоматически.", true);
                sent += batch.Count;
                RaiseProgress(entityType, sent, records.Count, finalBatch ? "complete" : "sending",
                    finalBatch ? "Готово" : "Отправка в BarDoctor…");
            }
        }

        private QueueItem BuildQueueItem(string entityType, List<Dictionary<string, object>> records,
            AdapterReadResult read, bool finalBatch)
        {
            QueueItem item = new QueueItem();
            item.Id = Guid.NewGuid().ToString("N");
            item.DeliveryId = "lc-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture) + "-" + item.Id;
            item.EntityType = entityType;
            item.Cursor = finalBatch ? read.NextCursor : "";
            foreach (Dictionary<string, object> record in records)
            {
                string externalId = JsonUtil.Text(record, "externalId");
                string fingerprint;
                if (read.Fingerprints.TryGetValue(externalId, out fingerprint))
                    item.Fingerprints[entityType + ":" + externalId] = fingerprint;
            }
            Dictionary<string, object> cursor = new Dictionary<string, object>();
            foreach (KeyValuePair<string, string> pair in Settings.Cursors) cursor[pair.Key] = pair.Value;
            if (finalBatch && !String.IsNullOrWhiteSpace(read.NextCursor)) cursor[entityType] = read.NextCursor;
            Dictionary<string, object> message = new Dictionary<string, object>();
            message["protocolVersion"] = "1.0";
            message["connectionId"] = Settings.ConnectionId;
            message["deliveryId"] = item.DeliveryId;
            message["sentAt"] = DateTime.UtcNow.ToString("o");
            message["cursor"] = cursor;
            message["entityType"] = entityType;
            message["records"] = records;
            item.PayloadJson = JsonUtil.Serialize(message);
            return item;
        }

        private void DrainQueue(BarDoctorClient client, SyncSummary summary, bool includeDelayed)
        {
            lock (_queueGate)
            {
                foreach (Tuple<string, QueueItem> queued in _queue.Ready(includeDelayed))
                {
                    try
                    {
                        DeliveryResult result = client.Send(queued.Item2.PayloadJson);
                        summary.Received += result.Received;
                        summary.Created += result.Created;
                        summary.Updated += result.Updated;
                        summary.Skipped += result.Skipped;
                        summary.Errors += result.Errors;
                        if (result.Errors == 0 && (result.RunStatus == "success" || result.Duplicate))
                        {
                            foreach (KeyValuePair<string, string> fingerprint in queued.Item2.Fingerprints)
                                Settings.Fingerprints[fingerprint.Key] = fingerprint.Value;
                            if (!String.IsNullOrWhiteSpace(queued.Item2.Cursor))
                                Settings.Cursors[queued.Item2.EntityType] = queued.Item2.Cursor;
                        }
                        else if (result.Errors > 0)
                        {
                            summary.Messages.Add(EntityLabel(queued.Item2.EntityType) + ": BarDoctor отклонил часть записей; они будут перечитаны при следующей синхронизации.");
                        }
                        _store.Save(Settings);
                        _queue.Complete(queued.Item1);
                    }
                    catch (ConnectorException error)
                    {
                        bool credentialsCanBeFixed = error.Code == "INVALID_INTEGRATION_TOKEN"
                            || error.Code == "CONNECTION_MISMATCH"
                            || error.Code == "SCOPE_DENIED"
                            || error.Code == "WAREHOUSE_SCOPE_DENIED";
                        if (credentialsCanBeFixed)
                        {
                            // Key rotation or configuration errors must never erase
                            // already prepared venue data. Keep the exact delivery
                            // and ID so it can be retried safely after correction.
                            _queue.Retry(queued.Item1, queued.Item2);
                            ConnectorLog.Error("Queued delivery awaits connector configuration", error);
                            throw;
                        }
                        if (!error.Retryable)
                        {
                            // A poison payload must not block all future entities.
                            _queue.Complete(queued.Item1);
                            summary.Errors++;
                            summary.Messages.Add(error.Message);
                            ConnectorLog.Error("Queued delivery was rejected permanently", error);
                            continue;
                        }
                        _queue.Retry(queued.Item1, queued.Item2);
                        ConnectorLog.Error("Queued delivery will be retried", error);
                        break;
                    }
                }
            }
        }

        private static void ValidateReady(ConnectorSettings value)
        {
            if (String.IsNullOrWhiteSpace(value.AccessKey))
                throw new ConnectorException("ACCESS_KEY_REQUIRED", "Вставьте ключ подключения BarDoctor.", false);
            if (String.IsNullOrWhiteSpace(value.ConnectionId))
                throw new ConnectorException("SERVER_CHECK_REQUIRED", "Сначала нажмите «Проверить связь с BarDoctor».", false);
            if (String.IsNullOrWhiteSpace(value.InfoBasePath))
                throw new ConnectorException("INFOBASE_REQUIRED", "Выберите информационную базу 1С.", false);
        }

        private void BackgroundHeartbeat()
        {
            if (IsSyncing || String.IsNullOrWhiteSpace(Settings.AccessKey) || String.IsNullOrWhiteSpace(Settings.ConnectionId)) return;
            try
            {
                BarDoctorClient client = new BarDoctorClient(Settings);
                DrainQueue(client, new SyncSummary(), false);
                client.Heartbeat(Settings, Settings.AutoSync ? "working" : "paused", _lastPlatform,
                    _lastConfiguration, _lastConfigurationVersion, "", Settings.ImportedCount, "", null);
            }
            catch (Exception error) { ConnectorLog.Error("Background heartbeat failed", error); }
        }

        private void AutomaticTick()
        {
            if (!Settings.AutoSync || IsSyncing) return;
            if (DateTime.UtcNow - _lastAutomaticUtc < TimeSpan.FromMinutes(Math.Max(15, Settings.IntervalMinutes))) return;
            try { SynchronizeNow(); }
            catch (Exception error) { ConnectorLog.Error("Automatic synchronization failed", error); }
        }

        private void TryHeartbeat(string status, string lastEntity, string error, DateTime? lastSync)
        {
            try
            {
                if (String.IsNullOrWhiteSpace(Settings.AccessKey) || String.IsNullOrWhiteSpace(Settings.ConnectionId)) return;
                new BarDoctorClient(Settings).Heartbeat(Settings, status, _lastPlatform,
                    _lastConfiguration, _lastConfigurationVersion, lastEntity, Settings.ImportedCount, error, lastSync);
            }
            catch (Exception heartbeatError) { ConnectorLog.Error("Could not send error heartbeat", heartbeatError); }
        }

        private static void RunSta(Action action)
        {
            Thread thread = new Thread(delegate()
            {
                try { action(); }
                catch (Exception error) { ConnectorLog.Error("Background operation failed", error); }
            });
            thread.IsBackground = true;
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
        }

        private void RaiseProgress(string entityType, int current, int total, string state, string message)
        {
            Action<EntitySyncProgress> handler = ProgressChanged;
            if (handler != null) handler(new EntitySyncProgress
            {
                EntityType = entityType,
                Current = current,
                Total = total,
                State = state,
                Message = message
            });
        }

        private void RaiseState(string value)
        {
            Action<string> handler = StateChanged;
            if (handler != null) handler(value);
        }

        public static string EntityLabel(string type)
        {
            if (type == "product") return "Номенклатура";
            if (type == "supplier") return "Поставщики";
            if (type == "warehouse") return "Склады";
            if (type == "purchase_document") return "Приходные накладные";
            if (type == "stock_balance") return "Остатки";
            return type;
        }

        public void Dispose()
        {
            if (_heartbeatTimer != null) _heartbeatTimer.Dispose();
            if (_automaticTimer != null) _automaticTimer.Dispose();
            _heartbeatTimer = null;
            _automaticTimer = null;
        }
    }
}
