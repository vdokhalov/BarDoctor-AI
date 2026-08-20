using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

namespace BarDoctor.LocalConnector
{
    internal interface ILocalAdapter : IDisposable
    {
        List<PlatformInstallation> DiscoverPlatforms();
        List<InfoBaseDescriptor> DiscoverInfoBases();
        OneCTestResult Test(ConnectorSettings settings);
        void Open(ConnectorSettings settings);
        AdapterReadResult Read(string entityType, ConnectorSettings settings, Action<int, string> progress);
        void Close();
        string PlatformVersion { get; }
        string ConfigurationName { get; }
        string ConfigurationVersion { get; }
    }

    /// <summary>
    /// Adapter for 1C:Enterprise 8.2 file infobases. The only data-access
    /// primitive used by this class is a 1C Query whose text starts with
    /// SELECT/ВЫБРАТЬ. It intentionally contains no object creation, Write,
    /// Post, Delete, exchange-plan registration or configuration API calls.
    /// </summary>
    internal sealed class OneCAdapter : ILocalAdapter
    {
        private static readonly string[] ProductCatalogs = { "Номенклатура", "Товары" };
        private static readonly string[] SupplierCatalogs = { "Контрагенты", "Поставщики" };
        private static readonly string[] WarehouseCatalogs = { "Склады", "МестаХранения" };
        private static readonly string[] PurchaseDocuments = {
            "ПоступлениеТоваровУслуг", "ПоступлениеТоваров", "ПриходнаяНакладная",
            "ПоступлениеТоваровНаСклад", "ПоступлениеЗапасов"
        };
        private static readonly string[] StockRegisters = {
            "ТоварыНаСкладах", "ЗапасыНаСкладах", "ОстаткиТоваров",
            "ТоварыОрганизаций", "ПартииТоваровНаСкладах"
        };

        private object _connector;
        private object _session;
        private object _metadata;
        private ConnectorSettings _settings;

        public string PlatformVersion { get; private set; }
        public string ConfigurationName { get; private set; }
        public string ConfigurationVersion { get; private set; }

        public OneCAdapter()
        {
            PlatformVersion = "";
            ConfigurationName = "";
            ConfigurationVersion = "";
        }

        public List<PlatformInstallation> DiscoverPlatforms()
        {
            Dictionary<string, PlatformInstallation> found = new Dictionary<string, PlatformInstallation>(StringComparer.OrdinalIgnoreCase);
            string[] roots = {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "1cv82"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "1cv82")
            };
            foreach (string root in roots.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (String.IsNullOrWhiteSpace(root) || !Directory.Exists(root)) continue;
                foreach (string executable in Directory.GetFiles(root, "1cv8.exe", SearchOption.AllDirectories))
                {
                    try
                    {
                        FileVersionInfo version = FileVersionInfo.GetVersionInfo(executable);
                        string label = String.IsNullOrWhiteSpace(version.FileVersion)
                            ? new DirectoryInfo(Path.GetDirectoryName(executable)).Name
                            : version.FileVersion;
                        found[executable] = new PlatformInstallation
                        {
                            Version = label,
                            BinPath = Path.GetDirectoryName(executable),
                            ProgId = "V82.COMConnector",
                            ComAvailable = Type.GetTypeFromProgID("V82.COMConnector", false) != null
                        };
                    }
                    catch (Exception error)
                    {
                        ConnectorLog.Error("Could not inspect 1C installation " + executable, error);
                    }
                }
            }
            if (found.Count == 0)
            {
                found["V82.COMConnector"] = new PlatformInstallation
                {
                    Version = "1С:Предприятие 8.2",
                    BinPath = "",
                    ProgId = "V82.COMConnector",
                    ComAvailable = Type.GetTypeFromProgID("V82.COMConnector", false) != null
                };
            }
            return found.Values.OrderByDescending(delegate(PlatformInstallation item) { return item.Version; }).ToList();
        }

        public List<InfoBaseDescriptor> DiscoverInfoBases()
        {
            List<InfoBaseDescriptor> result = new List<InfoBaseDescriptor>();
            string roaming = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string[] candidates = {
                Path.Combine(roaming, "1C", "1CEStart", "ibases.v8i"),
                Path.Combine(roaming, "1C", "1Cv82", "ibases.v8i")
            };
            foreach (string file in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (!File.Exists(file)) continue;
                try { ParseInfoBaseList(file, result); }
                catch (Exception error) { ConnectorLog.Error("Could not parse 1C infobase list", error); }
            }
            return result
                .Where(delegate(InfoBaseDescriptor value) { return !String.IsNullOrWhiteSpace(value.Path); })
                .GroupBy(delegate(InfoBaseDescriptor value) { return value.Path; }, StringComparer.OrdinalIgnoreCase)
                .Select(delegate(IGrouping<string, InfoBaseDescriptor> values) { return values.First(); })
                .OrderBy(delegate(InfoBaseDescriptor value) { return value.Name; })
                .ToList();
        }

        private static void ParseInfoBaseList(string file, List<InfoBaseDescriptor> target)
        {
            string section = "";
            foreach (string raw in File.ReadAllLines(file, Encoding.UTF8))
            {
                string line = raw.Trim();
                if (line.StartsWith("[") && line.EndsWith("]"))
                {
                    section = line.Substring(1, line.Length - 2).Trim();
                    continue;
                }
                if (!line.StartsWith("Connect=", StringComparison.OrdinalIgnoreCase)) continue;
                Match filePath = Regex.Match(line, "File\\s*=\\s*\"(?<path>[^\"]+)\"", RegexOptions.IgnoreCase);
                if (!filePath.Success) continue;
                target.Add(new InfoBaseDescriptor
                {
                    Name = String.IsNullOrWhiteSpace(section) ? Path.GetFileName(filePath.Groups["path"].Value) : section,
                    Path = Environment.ExpandEnvironmentVariables(filePath.Groups["path"].Value),
                    Version = "8.2",
                    ConfigurationName = "",
                    ConfigurationVersion = ""
                });
            }
        }

        public OneCTestResult Test(ConnectorSettings settings)
        {
            OneCTestResult result = new OneCTestResult();
            try
            {
                Open(settings);
                // A one-row SELECT confirms that the selected user can read the
                // infobase without relying on any configuration write operation.
                object productMeta = RequireMetadata("Catalogs", "Справочники", ProductCatalogs,
                    "ONEC_PRODUCTS_NOT_FOUND", "справочник номенклатуры");
                ExecuteSelect(
                    "ВЫБРАТЬ ПЕРВЫЕ 1 C.Ссылка КАК ReadCheck ИЗ Справочник."
                        + Identifier(MetadataName(productMeta)) + " КАК C",
                    null, new[] { "ReadCheck" }, null);
                result.Ok = true;
                result.PlatformVersion = PlatformVersion;
                result.ConfigurationName = ConfigurationName;
                result.ConfigurationVersion = ConfigurationVersion;
                result.Profile = DetectProfile();
                ValidateMinimumMetadata(result.Warnings);
            }
            finally
            {
                Close();
            }
            return result;
        }

        public void Open(ConnectorSettings settings)
        {
            Close();
            if (settings == null) throw new ArgumentNullException("settings");
            if (String.IsNullOrWhiteSpace(settings.InfoBasePath) || !Directory.Exists(settings.InfoBasePath))
                throw new ConnectorException("INFOBASE_NOT_FOUND", "Выбранная информационная база 1С не найдена. Проверьте путь к папке базы.", false);
            Type type = Type.GetTypeFromProgID("V82.COMConnector", false);
            if (type == null)
                throw new ConnectorException("ONEC_COM_NOT_REGISTERED", "Компонент COM-соединения 1С 8.2 не зарегистрирован на этом компьютере.", false);
            try
            {
                _connector = Activator.CreateInstance(type);
                _settings = settings;
                string connectionString = BuildConnectionString(settings);
                _session = ComAccess.Call(_connector, new[] { "Connect", "Соединить" }, connectionString);
                if (_session == null) throw new Exception("1C returned an empty external connection");
                _metadata = ComAccess.Member(_session, new[] { "Metadata", "Метаданные" });
                if (_metadata == null) throw new Exception("1C metadata is unavailable");
                PlatformVersion = BestPlatformVersion();
                ConfigurationName = TextMember(_metadata, new[] { "Name", "Имя", "ConfigurationName", "ИмяКонфигурации" });
                ConfigurationVersion = TextMember(_metadata, new[] { "Version", "Версия", "ConfigurationVersion", "ВерсияКонфигурации" });
                if (String.IsNullOrWhiteSpace(ConfigurationName)) ConfigurationName = "Конфигурация 1С";
                ConnectorLog.Info("Opened 1C infobase in query-only mode: " + ConfigurationName + " " + ConfigurationVersion);
            }
            catch
            {
                Close();
                throw;
            }
        }

        private static string BuildConnectionString(ConnectorSettings settings)
        {
            string path = settings.InfoBasePath.Replace("\"", "\"\"");
            string user = (settings.OneCUser ?? "").Replace("\"", "\"\"");
            string password = (settings.OneCPassword ?? "").Replace("\"", "\"\"");
            StringBuilder value = new StringBuilder();
            value.Append("File=\"").Append(path).Append("\";");
            if (!String.IsNullOrWhiteSpace(user)) value.Append("Usr=\"").Append(user).Append("\";");
            if (!String.IsNullOrEmpty(password)) value.Append("Pwd=\"").Append(password).Append("\";");
            return value.ToString();
        }

        private string BestPlatformVersion()
        {
            PlatformInstallation value = DiscoverPlatforms().FirstOrDefault(delegate(PlatformInstallation item) { return item.ComAvailable; });
            return value == null ? "8.2" : value.Version;
        }

        private string DetectProfile()
        {
            string source = (ConfigurationName + " " + ConfigurationVersion).ToLowerInvariant();
            if (source.Contains("общепит")) return "onec-common-catering-v1";
            return "onec-metadata-compatible-v1";
        }

        private void ValidateMinimumMetadata(List<string> warnings)
        {
            if (FindMetadata("Catalogs", "Справочники", ProductCatalogs) == null)
                throw new ConnectorException("ONEC_PRODUCTS_NOT_FOUND", "В конфигурации 1С не найден справочник номенклатуры. Адаптер не сможет безопасно определить товары.", false);
            if (FindMetadata("Catalogs", "Справочники", WarehouseCatalogs) == null)
                warnings.Add("Справочник складов не найден по стандартным именам; синхронизация складов будет недоступна.");
            if (FindMetadata("Documents", "Документы", PurchaseDocuments) == null)
                warnings.Add("Приходные документы не найдены по профилю Общепит 2.0; проверьте диагностику метаданных.");
            if (FindMetadata("AccumulationRegisters", "РегистрыНакопления", StockRegisters) == null)
                warnings.Add("Регистр остатков не найден по стандартным именам; остатки будут пропущены.");
        }

        public AdapterReadResult Read(string entityType, ConnectorSettings settings, Action<int, string> progress)
        {
            if (_session == null) throw new InvalidOperationException("1C connection is not open");
            if (entityType == "product") return ReadProducts(settings, progress);
            if (entityType == "supplier") return ReadSuppliers(settings, progress);
            if (entityType == "warehouse") return ReadWarehouses(settings, progress);
            if (entityType == "purchase_document") return ReadPurchases(settings, progress);
            if (entityType == "stock_balance") return ReadStock(settings, progress);
            throw new ConnectorException("ENTITY_NOT_SUPPORTED", "Этот тип данных пока не поддерживается адаптером 1С.", false);
        }

        private AdapterReadResult ReadProducts(ConnectorSettings settings, Action<int, string> progress)
        {
            object meta = RequireMetadata("Catalogs", "Справочники", ProductCatalogs, "ONEC_PRODUCTS_NOT_FOUND", "справочник номенклатуры");
            string name = Identifier(MetadataName(meta));
            string unit = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "ЕдиницаХраненияОстатков", "БазоваяЕдиницаИзмерения", "ЕдиницаИзмерения", "Единица" });
            string article = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "Артикул", "АртикулНоменклатуры" });
            string updated = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "ДатаИзменения", "ДатаОбновления", "ДатаРедактирования" });
            List<string> columns = new List<string> { "Ref", "Code", "Name", "Parent", "IsGroup", "DeletionMark" };
            StringBuilder query = new StringBuilder("ВЫБРАТЬ C.Ссылка КАК Ref, C.Код КАК Code, C.Наименование КАК Name, C.Родитель КАК Parent, C.ЭтоГруппа КАК IsGroup, C.ПометкаУдаления КАК DeletionMark");
            AddOptional(query, columns, "C", unit, "Unit");
            AddOptional(query, columns, "C", article, "Article");
            AddOptional(query, columns, "C", updated, "UpdatedAt");
            query.Append(" ИЗ Справочник.").Append(name).Append(" КАК C ГДЕ C.ЭтоГруппа = ЛОЖЬ");
            Dictionary<string, object> parameters = IncrementalCatalogFilter(query, "C", updated, settings, "product");
            List<Dictionary<string, object>> rows = ExecuteSelect(query.ToString(), parameters, columns.ToArray(), progress);
            AdapterReadResult result = NewResult("product");
            int index = 0;
            foreach (Dictionary<string, object> row in rows)
            {
                index++;
                string externalId = StableReference(row["Ref"], "product", Convert.ToString(row["Code"]));
                string parentId = StableReference(Value(row, "Parent"), "group", "");
                Dictionary<string, object> record = new Dictionary<string, object>();
                record["externalId"] = externalId;
                record["code"] = Clean(row["Code"]);
                record["name"] = Clean(row["Name"]);
                record["groupExternalId"] = parentId;
                record["category"] = Presentation(Value(row, "Parent"));
                record["unit"] = Presentation(Value(row, "Unit"));
                record["article"] = Clean(Value(row, "Article"));
                record["active"] = !BooleanValue(Value(row, "DeletionMark"));
                PutDate(record, "externalUpdatedAt", Value(row, "UpdatedAt"));
                Add(result, record, externalId);
            }
            if (String.IsNullOrWhiteSpace(updated)) result.Warnings.Add("В справочнике нет даты изменения: агент сравнивает защищённые отпечатки и отправляет только изменившиеся товары.");
            result.NextCursor = DateTime.UtcNow.AddMinutes(-5).ToString("o");
            return result;
        }

        private AdapterReadResult ReadSuppliers(ConnectorSettings settings, Action<int, string> progress)
        {
            object meta = RequireMetadata("Catalogs", "Справочники", SupplierCatalogs, "ONEC_SUPPLIERS_NOT_FOUND", "справочник контрагентов");
            string name = Identifier(MetadataName(meta));
            string tax = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "ИНН", "УНП", "ФискальныйКод", "КодНалогоплательщика" });
            string phone = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "Телефон", "ОсновнойТелефон" });
            string email = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "Email", "АдресЭлектроннойПочты", "ЭлектроннаяПочта" });
            string supplier = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "Поставщик", "ЯвляетсяПоставщиком" });
            string updated = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "ДатаИзменения", "ДатаОбновления", "ДатаРедактирования" });
            List<string> columns = new List<string> { "Ref", "Code", "Name", "IsGroup", "DeletionMark" };
            StringBuilder query = new StringBuilder("ВЫБРАТЬ C.Ссылка КАК Ref, C.Код КАК Code, C.Наименование КАК Name, C.ЭтоГруппа КАК IsGroup, C.ПометкаУдаления КАК DeletionMark");
            AddOptional(query, columns, "C", tax, "TaxId");
            AddOptional(query, columns, "C", phone, "Phone");
            AddOptional(query, columns, "C", email, "Email");
            AddOptional(query, columns, "C", supplier, "IsSupplier");
            AddOptional(query, columns, "C", updated, "UpdatedAt");
            query.Append(" ИЗ Справочник.").Append(name).Append(" КАК C ГДЕ C.ЭтоГруппа = ЛОЖЬ");
            if (!String.IsNullOrWhiteSpace(supplier)) query.Append(" И C.").Append(Identifier(supplier)).Append(" = ИСТИНА");
            Dictionary<string, object> parameters = IncrementalCatalogFilter(query, "C", updated, settings, "supplier");
            List<Dictionary<string, object>> rows = ExecuteSelect(query.ToString(), parameters, columns.ToArray(), progress);
            AdapterReadResult result = NewResult("supplier");
            foreach (Dictionary<string, object> row in rows)
            {
                string externalId = StableReference(row["Ref"], "supplier", Convert.ToString(row["Code"]));
                Dictionary<string, object> record = new Dictionary<string, object>();
                record["externalId"] = externalId;
                record["code"] = Clean(row["Code"]);
                record["name"] = Clean(row["Name"]);
                record["taxId"] = Clean(Value(row, "TaxId"));
                record["phone"] = Clean(Value(row, "Phone"));
                record["email"] = Clean(Value(row, "Email"));
                record["active"] = !BooleanValue(Value(row, "DeletionMark"));
                PutDate(record, "externalUpdatedAt", Value(row, "UpdatedAt"));
                Add(result, record, externalId);
            }
            if (String.IsNullOrWhiteSpace(updated)) result.Warnings.Add("В справочнике контрагентов нет даты изменения: агент сравнивает отпечатки записей.");
            result.NextCursor = DateTime.UtcNow.AddMinutes(-5).ToString("o");
            return result;
        }

        private AdapterReadResult ReadWarehouses(ConnectorSettings settings, Action<int, string> progress)
        {
            object meta = RequireMetadata("Catalogs", "Справочники", WarehouseCatalogs, "ONEC_WAREHOUSES_NOT_FOUND", "справочник складов");
            string name = Identifier(MetadataName(meta));
            string updated = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "ДатаИзменения", "ДатаОбновления", "ДатаРедактирования" });
            List<string> columns = new List<string> { "Ref", "Code", "Name", "IsGroup", "DeletionMark" };
            StringBuilder query = new StringBuilder("ВЫБРАТЬ C.Ссылка КАК Ref, C.Код КАК Code, C.Наименование КАК Name, C.ЭтоГруппа КАК IsGroup, C.ПометкаУдаления КАК DeletionMark");
            AddOptional(query, columns, "C", updated, "UpdatedAt");
            query.Append(" ИЗ Справочник.").Append(name).Append(" КАК C ГДЕ C.ЭтоГруппа = ЛОЖЬ");
            Dictionary<string, object> parameters = IncrementalCatalogFilter(query, "C", updated, settings, "warehouse");
            List<Dictionary<string, object>> rows = ExecuteSelect(query.ToString(), parameters, columns.ToArray(), progress);
            AdapterReadResult result = NewResult("warehouse");
            foreach (Dictionary<string, object> row in rows)
            {
                string externalId = StableReference(row["Ref"], "warehouse", Convert.ToString(row["Code"]));
                Dictionary<string, object> record = new Dictionary<string, object>();
                record["externalId"] = externalId;
                record["code"] = Clean(row["Code"]);
                record["name"] = Clean(row["Name"]);
                record["active"] = !BooleanValue(Value(row, "DeletionMark"));
                PutDate(record, "externalUpdatedAt", Value(row, "UpdatedAt"));
                Add(result, record, externalId);
            }
            if (String.IsNullOrWhiteSpace(updated)) result.Warnings.Add("В справочнике складов нет даты изменения: агент сравнивает отпечатки записей.");
            result.NextCursor = DateTime.UtcNow.AddMinutes(-5).ToString("o");
            return result;
        }

        private AdapterReadResult ReadPurchases(ConnectorSettings settings, Action<int, string> progress)
        {
            object meta = RequireMetadata("Documents", "Документы", PurchaseDocuments, "ONEC_PURCHASES_NOT_FOUND", "приходные документы");
            string documentName = Identifier(MetadataName(meta));
            object section = FindChildMetadata(meta, new[] { "TabularSections", "ТабличныеЧасти" }, new[] { "Товары", "Номенклатура", "Запасы", "Состав" });
            if (section == null) throw new ConnectorException("ONEC_PURCHASE_LINES_NOT_FOUND", "У приходного документа не найдена табличная часть с товарами.", false);
            string sectionName = Identifier(MetadataName(section));
            string supplier = RequiredField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "Контрагент", "Поставщик" }, "поставщика");
            string warehouse = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "Склад", "СкладПолучатель", "МестоХранения" });
            string currency = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "ВалютаДокумента", "Валюта" });
            string total = ResolveField(meta, new[] { "Attributes", "Реквизиты" }, new[] { "СуммаДокумента", "Сумма" });
            string product = RequiredField(section, new[] { "Attributes", "Реквизиты" }, new[] { "Номенклатура", "Товар", "Запас" }, "номенклатуры строки");
            string quantity = RequiredField(section, new[] { "Attributes", "Реквизиты" }, new[] { "Количество", "КоличествоМест" }, "количества строки");
            string unit = ResolveField(section, new[] { "Attributes", "Реквизиты" }, new[] { "ЕдиницаИзмерения", "Единица", "ЕдиницаХраненияОстатков" });
            string price = ResolveField(section, new[] { "Attributes", "Реквизиты" }, new[] { "Цена", "ЦенаЗакупки" });
            string lineTotal = ResolveField(section, new[] { "Attributes", "Реквизиты" }, new[] { "Сумма", "СуммаСтроки" });
            List<string> columns = new List<string> { "DocRef", "Number", "Date", "Supplier", "Posted", "Product", "Quantity" };
            StringBuilder query = new StringBuilder();
            query.Append("ВЫБРАТЬ D.Ссылка КАК DocRef, D.Номер КАК Number, D.Дата КАК Date, D.").Append(Identifier(supplier)).Append(" КАК Supplier, D.Проведен КАК Posted, L.").Append(Identifier(product)).Append(" КАК Product, L.").Append(Identifier(quantity)).Append(" КАК Quantity");
            AddOptional(query, columns, "D", warehouse, "Warehouse");
            AddOptional(query, columns, "D", currency, "Currency");
            AddOptional(query, columns, "D", total, "DocumentTotal");
            AddOptional(query, columns, "L", unit, "Unit");
            AddOptional(query, columns, "L", price, "Price");
            AddOptional(query, columns, "L", lineTotal, "LineTotal");
            query.Append(" ИЗ Документ.").Append(documentName).Append(" КАК D ВНУТРЕННЕЕ СОЕДИНЕНИЕ Документ.").Append(documentName).Append(".").Append(sectionName).Append(" КАК L ПО D.Ссылка = L.Ссылка ГДЕ D.ПометкаУдаления = ЛОЖЬ И D.Проведен = ИСТИНА И D.Дата >= &Since УПОРЯДОЧИТЬ ПО D.Дата");
            DateTime since = PurchaseSince(settings);
            Dictionary<string, object> parameters = new Dictionary<string, object> { { "Since", since } };
            List<Dictionary<string, object>> rows = ExecuteSelect(query.ToString(), parameters, columns.ToArray(), progress);
            Dictionary<string, Dictionary<string, object>> documents = new Dictionary<string, Dictionary<string, object>>(StringComparer.OrdinalIgnoreCase);
            DateTime latest = DateTime.Now;
            int lineIndex = 0;
            foreach (Dictionary<string, object> row in rows)
            {
                lineIndex++;
                string documentId = StableReference(row["DocRef"], "purchase", Convert.ToString(row["Number"]));
                Dictionary<string, object> document;
                if (!documents.TryGetValue(documentId, out document))
                {
                    DateTime date = DateValue(row["Date"], since);
                    if (date > latest) latest = date;
                    document = new Dictionary<string, object>();
                    document["externalId"] = documentId;
                    document["documentExternalId"] = documentId;
                    document["documentNumber"] = Clean(row["Number"]);
                    document["date"] = date.ToString("yyyy-MM-dd");
                    document["externalUpdatedAt"] = date.ToUniversalTime().ToString("o");
                    document["supplierExternalId"] = StableReference(row["Supplier"], "supplier", "");
                    document["supplierName"] = Presentation(row["Supplier"]);
                    document["supplierType"] = "wholesale";
                    document["warehouseExternalId"] = StableReference(Value(row, "Warehouse"), "warehouse", "");
                    document["currency"] = Presentation(Value(row, "Currency"));
                    document["total"] = DecimalValue(Value(row, "DocumentTotal"));
                    document["externalStatus"] = "posted";
                    document["documentType"] = "invoice";
                    document["paymentMethod"] = "unknown";
                    document["expenseCategory"] = "products";
                    document["items"] = new List<Dictionary<string, object>>();
                    documents[documentId] = document;
                }
                object productRef = row["Product"];
                decimal itemQuantity = DecimalValue(row["Quantity"]);
                decimal itemPrice = DecimalValue(Value(row, "Price"));
                decimal itemTotal = DecimalValue(Value(row, "LineTotal"));
                if (itemTotal == 0 && itemPrice != 0) itemTotal = itemQuantity * itemPrice;
                if (itemPrice == 0 && itemQuantity != 0) itemPrice = itemTotal / itemQuantity;
                Dictionary<string, object> item = new Dictionary<string, object>();
                item["id"] = documentId + ":" + lineIndex.ToString(CultureInfo.InvariantCulture);
                item["externalProductId"] = StableReference(productRef, "product", "");
                item["productExternalId"] = item["externalProductId"];
                item["name"] = Presentation(productRef);
                item["quantity"] = itemQuantity;
                item["unit"] = Presentation(Value(row, "Unit"));
                item["unitPrice"] = itemPrice;
                item["lineTotal"] = itemTotal;
                ((List<Dictionary<string, object>>)document["items"]).Add(item);
            }
            AdapterReadResult result = NewResult("purchase_document");
            foreach (KeyValuePair<string, Dictionary<string, object>> pair in documents)
            {
                if (DecimalValue(Value(pair.Value, "total")) == 0)
                {
                    List<Dictionary<string, object>> items = (List<Dictionary<string, object>>)pair.Value["items"];
                    pair.Value["total"] = items.Sum(delegate(Dictionary<string, object> item) { return DecimalValue(item["lineTotal"]); });
                }
                if (String.IsNullOrWhiteSpace(Convert.ToString(pair.Value["currency"]))) pair.Value["currency"] = "RUB";
                Add(result, pair.Value, pair.Key);
            }
            // Five-minute overlap protects documents created at the cursor edge.
            result.NextCursor = latest.AddMinutes(-5).ToUniversalTime().ToString("o");
            result.Warnings.Add("1С 8.2 не гарантирует универсальную дату изменения документа. Адаптер использует cursor с перекрытием и отпечатки содержимого.");
            return result;
        }

        private DateTime PurchaseSince(ConnectorSettings settings)
        {
            string value;
            DateTime cursor;
            if (settings.Cursors.TryGetValue("purchase_document", out value)
                && DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out cursor))
                // Configuration 1C 8.2 does not expose a universal modified-at
                // field for documents. Re-reading a bounded seven-day overlap
                // catches corrections to recent receipts; fingerprints prevent
                // unchanged documents from leaving the computer.
                return cursor.ToLocalTime().AddDays(-7);
            return DateTime.Now.AddDays(-Math.Max(1, Math.Min(3650, settings.InitialSyncDays)));
        }

        private AdapterReadResult ReadStock(ConnectorSettings settings, Action<int, string> progress)
        {
            object meta = RequireMetadata("AccumulationRegisters", "РегистрыНакопления", StockRegisters, "ONEC_STOCK_REGISTER_NOT_FOUND", "регистр остатков");
            string registerName = Identifier(MetadataName(meta));
            string product = RequiredField(meta, new[] { "Dimensions", "Измерения" }, new[] { "Номенклатура", "Товар", "Запас" }, "номенклатуры регистра");
            string warehouse = RequiredField(meta, new[] { "Dimensions", "Измерения" }, new[] { "Склад", "МестоХранения" }, "склада регистра");
            string quantity = RequiredField(meta, new[] { "Resources", "Ресурсы" }, new[] { "Количество", "КоличествоОстаток", "Остаток" }, "количества регистра");
            string amount = ResolveField(meta, new[] { "Resources", "Ресурсы" }, new[] { "Стоимость", "Сумма", "СтоимостьОстаток" });
            object productMeta = FindMetadata("Catalogs", "Справочники", ProductCatalogs);
            string stockUnit = productMeta == null ? "" : ResolveField(productMeta,
                new[] { "Attributes", "Реквизиты" },
                new[] { "ЕдиницаХраненияОстатков", "БазоваяЕдиницаИзмерения", "ЕдиницаИзмерения", "Единица" });
            List<string> columns = new List<string> { "Product", "Warehouse", "Quantity" };
            StringBuilder query = new StringBuilder("ВЫБРАТЬ B.").Append(Identifier(product)).Append(" КАК Product, B.").Append(Identifier(warehouse)).Append(" КАК Warehouse, B.").Append(Identifier(BalanceResource(quantity))).Append(" КАК Quantity");
            if (!String.IsNullOrWhiteSpace(amount))
            {
                query.Append(", B.").Append(Identifier(BalanceResource(amount))).Append(" КАК Amount");
                columns.Add("Amount");
            }
            if (!String.IsNullOrWhiteSpace(stockUnit))
            {
                query.Append(", B.").Append(Identifier(product)).Append(".").Append(Identifier(stockUnit)).Append(" КАК Unit");
                columns.Add("Unit");
            }
            query.Append(" ИЗ РегистрНакопления.").Append(registerName).Append(".Остатки(&Moment) КАК B");
            DateTime moment = DateTime.Now;
            List<Dictionary<string, object>> rows = ExecuteSelect(query.ToString(), new Dictionary<string, object> { { "Moment", moment } }, columns.ToArray(), progress);
            AdapterReadResult result = NewResult("stock_balance");
            HashSet<string> current = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            Dictionary<string, Dictionary<string, object>> aggregates = new Dictionary<string, Dictionary<string, object>>(StringComparer.OrdinalIgnoreCase);
            foreach (Dictionary<string, object> row in rows)
            {
                string productId = StableReference(row["Product"], "product", "");
                string warehouseId = StableReference(row["Warehouse"], "warehouse", "");
                string externalId = "stock:" + warehouseId + ":" + productId;
                decimal quantityValue = DecimalValue(row["Quantity"]);
                decimal totalValue = DecimalValue(Value(row, "Amount"));
                Dictionary<string, object> record;
                if (!aggregates.TryGetValue(externalId, out record))
                {
                    string unitPresentation = Presentation(Value(row, "Unit"));
                    record = new Dictionary<string, object>();
                    record["externalId"] = externalId;
                    record["productExternalId"] = productId;
                    record["productName"] = Presentation(row["Product"]);
                    record["warehouseExternalId"] = warehouseId;
                    record["quantity"] = 0M;
                    record["unit"] = String.IsNullOrWhiteSpace(unitPresentation) ? "шт." : unitPresentation;
                    record["measuredAt"] = moment.ToString("yyyy-MM-dd");
                    record["totalValue"] = 0M;
                    aggregates[externalId] = record;
                }
                record["quantity"] = DecimalValue(record["quantity"]) + quantityValue;
                record["totalValue"] = DecimalValue(record["totalValue"]) + totalValue;
            }
            foreach (KeyValuePair<string, Dictionary<string, object>> pair in aggregates)
            {
                Dictionary<string, object> record = pair.Value;
                decimal quantityValue = DecimalValue(record["quantity"]);
                decimal totalValue = DecimalValue(record["totalValue"]);
                if (totalValue == 0) record.Remove("totalValue");
                else if (quantityValue != 0) record["averageUnitCost"] = totalValue / quantityValue;
                string externalId = pair.Key;
                current.Add(externalId);
                settings.StockState[externalId] = JsonUtil.Serialize(record);
                Add(result, record, externalId);
            }
            // A vanished register row means a real zero balance. Preserve the
            // previous identifiers locally so that zero is not silently lost.
            foreach (string previous in settings.StockState.Keys.ToList())
            {
                if (current.Contains(previous)) continue;
                Dictionary<string, object> zero;
                try { zero = JsonUtil.Deserialize<Dictionary<string, object>>(settings.StockState[previous]); }
                catch { continue; }
                zero["quantity"] = 0;
                zero["measuredAt"] = moment.ToString("yyyy-MM-dd");
                settings.StockState[previous] = JsonUtil.Serialize(zero);
                Add(result, zero, previous);
            }
            result.NextCursor = moment.ToUniversalTime().ToString("o");
            if (String.IsNullOrWhiteSpace(stockUnit)) result.Warnings.Add("Единица хранения остатков не найдена; для регистра используется «шт.». Проверьте строки с единицами в журнале синхронизации.");
            return result;
        }

        private static AdapterReadResult NewResult(string type)
        {
            return new AdapterReadResult { EntityType = type };
        }

        private static void Add(AdapterReadResult result, Dictionary<string, object> value, string externalId)
        {
            string json = JsonUtil.Serialize(value);
            result.Records.Add(value);
            result.Fingerprints[externalId] = HashUtil.Sha256(json);
        }

        private static string BalanceResource(string resourceName)
        {
            return resourceName.EndsWith("Остаток", StringComparison.OrdinalIgnoreCase)
                ? resourceName
                : resourceName + "Остаток";
        }

        private List<Dictionary<string, object>> ExecuteSelect(string queryText, Dictionary<string, object> parameters, string[] aliases, Action<int, string> progress)
        {
            EnsureSelectOnly(queryText);
            object query = null;
            object execution = null;
            object selection = null;
            try
            {
                try { query = ComAccess.Call(_session, new[] { "NewObject", "НовыйОбъект" }, "Query", queryText); }
                catch { query = ComAccess.Call(_session, new[] { "NewObject", "НовыйОбъект" }, "Запрос", queryText); }
                if (parameters != null)
                    foreach (KeyValuePair<string, object> parameter in parameters)
                        ComAccess.Call(query, new[] { "SetParameter", "УстановитьПараметр" }, parameter.Key, parameter.Value);
                execution = ComAccess.Call(query, new[] { "Execute", "Выполнить" });
                selection = ComAccess.Call(execution, new[] { "Select", "Выбрать" });
                List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
                while (BooleanValue(ComAccess.Call(selection, new[] { "Next", "Следующий" })))
                {
                    Dictionary<string, object> row = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                    foreach (string alias in aliases) row[alias] = ComAccess.Member(selection, new[] { alias });
                    rows.Add(row);
                    if (progress != null && (rows.Count == 1 || rows.Count % 100 == 0)) progress(rows.Count, "Чтение 1С");
                    if (rows.Count > 500000) throw new ConnectorException("ONEC_RESULT_TOO_LARGE", "Запрос 1С вернул больше 500 000 строк. Уменьшите период первой синхронизации.", false);
                }
                if (progress != null) progress(rows.Count, "Данные прочитаны");
                return rows;
            }
            finally
            {
                ComAccess.Release(selection);
                ComAccess.Release(execution);
                ComAccess.Release(query);
            }
        }

        private static void EnsureSelectOnly(string query)
        {
            string value = (query ?? "").TrimStart();
            if (!(value.StartsWith("ВЫБРАТЬ", StringComparison.OrdinalIgnoreCase)
                || value.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase)))
                throw new ConnectorException("READ_ONLY_VIOLATION", "Адаптер заблокировал запрос, который не является чтением.", false);
            string upper = value.ToUpperInvariant();
            string[] forbidden = { " ЗАПИСАТЬ", " УДАЛИТЬ", " ИЗМЕНИТЬ", " INSERT ", " UPDATE ", " DELETE ", " DROP ", " ALTER " };
            if (forbidden.Any(delegate(string token) { return upper.Contains(token); }))
                throw new ConnectorException("READ_ONLY_VIOLATION", "Адаптер заблокировал потенциально изменяющий запрос.", false);
        }

        private object RequireMetadata(string englishCollection, string russianCollection, string[] names, string code, string label)
        {
            object result = FindMetadata(englishCollection, russianCollection, names);
            if (result == null) throw new ConnectorException(code, "В конфигурации 1С не найден " + label + ". Откройте техническую диагностику и передайте её в BarDoctor.", false);
            return result;
        }

        private object FindMetadata(string englishCollection, string russianCollection, string[] names)
        {
            object collection = ComAccess.Member(_metadata, new[] { englishCollection, russianCollection });
            return FindInCollection(collection, names);
        }

        private static object FindChildMetadata(object parent, string[] collectionNames, string[] names)
        {
            object collection = ComAccess.Member(parent, collectionNames);
            return FindInCollection(collection, names);
        }

        private static object FindInCollection(object collection, string[] names)
        {
            if (collection == null) return null;
            foreach (string candidate in names)
            {
                try
                {
                    object direct = ComAccess.Call(collection, new[] { "Find", "Найти" }, candidate);
                    if (direct != null && !String.IsNullOrWhiteSpace(MetadataName(direct))) return direct;
                }
                catch { }
            }
            int count = ComAccess.Count(collection);
            for (int index = 0; index < count; index++)
            {
                object item = ComAccess.Item(collection, index);
                string itemName = MetadataName(item);
                if (names.Any(delegate(string candidate) { return String.Equals(candidate, itemName, StringComparison.OrdinalIgnoreCase); })) return item;
                ComAccess.Release(item);
            }
            return null;
        }

        private static string ResolveField(object parent, string[] collectionNames, string[] candidates)
        {
            object value = FindChildMetadata(parent, collectionNames, candidates);
            if (value == null) return "";
            string name = MetadataName(value);
            ComAccess.Release(value);
            return name;
        }

        private static string RequiredField(object parent, string[] collectionNames, string[] candidates, string label)
        {
            string value = ResolveField(parent, collectionNames, candidates);
            if (String.IsNullOrWhiteSpace(value))
                throw new ConnectorException("ONEC_FIELD_NOT_FOUND", "В метаданных 1С не найдено поле " + label + ".", false);
            return value;
        }

        private static string MetadataName(object value)
        {
            return TextMember(value, new[] { "Name", "Имя" });
        }

        private static string TextMember(object value, string[] names)
        {
            try { return Clean(ComAccess.Member(value, names)); }
            catch { return ""; }
        }

        private static void AddOptional(StringBuilder query, List<string> aliases, string source, string field, string alias)
        {
            if (String.IsNullOrWhiteSpace(field)) return;
            query.Append(", ").Append(source).Append(".").Append(Identifier(field)).Append(" КАК ").Append(alias);
            aliases.Add(alias);
        }

        private static Dictionary<string, object> IncrementalCatalogFilter(
            StringBuilder query,
            string source,
            string updatedField,
            ConnectorSettings settings,
            string entityType)
        {
            if (String.IsNullOrWhiteSpace(updatedField) || settings == null) return null;
            string cursorValue;
            DateTime cursor;
            if (!settings.Cursors.TryGetValue(entityType, out cursorValue)
                || !DateTime.TryParse(cursorValue, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out cursor))
                return null;
            query.Append(" И ").Append(source).Append(".").Append(Identifier(updatedField)).Append(" >= &ChangedSince");
            return new Dictionary<string, object>
            {
                { "ChangedSince", cursor.ToLocalTime().AddMinutes(-5) }
            };
        }

        private static string Identifier(string value)
        {
            string result = (value ?? "").Trim();
            if (!Regex.IsMatch(result, "^[A-Za-zА-Яа-яЁё_][A-Za-zА-Яа-яЁё0-9_]*$"))
                throw new ConnectorException("ONEC_METADATA_NAME_INVALID", "1С вернула небезопасное имя объекта метаданных.", false);
            return result;
        }

        private string StableReference(object value, string prefix, string fallback)
        {
            if (value == null) return String.IsNullOrWhiteSpace(fallback) ? "" : prefix + ":" + HashUtil.Sha256(fallback).Substring(0, 32);
            try
            {
                object guid = ComAccess.Call(value, new[] { "UniqueIdentifier", "УникальныйИдентификатор" });
                string text = Clean(guid).Trim('{', '}').ToLowerInvariant();
                if (!String.IsNullOrWhiteSpace(text)) return text;
            }
            catch { }
            try
            {
                object xml = ComAccess.Call(_session, new[] { "XMLString", "XMLСтрока" }, value);
                string text = Clean(xml);
                if (!String.IsNullOrWhiteSpace(text)) return text;
            }
            catch { }
            string presentation = Presentation(value) + "|" + fallback;
            return prefix + ":" + HashUtil.Sha256(presentation).Substring(0, 32);
        }

        private string Presentation(object value)
        {
            if (value == null) return "";
            try { return Clean(ComAccess.Call(_session, new[] { "String", "Строка" }, value)); }
            catch { return Clean(value); }
        }

        private static object Value(Dictionary<string, object> row, string key)
        {
            object value;
            return row != null && row.TryGetValue(key, out value) ? value : null;
        }

        private static string Clean(object value)
        {
            if (value == null) return "";
            return Convert.ToString(value, CultureInfo.InvariantCulture).Trim();
        }

        private static bool BooleanValue(object value)
        {
            if (value is bool) return (bool)value;
            bool result;
            return Boolean.TryParse(Clean(value), out result) && result;
        }

        private static decimal DecimalValue(object value)
        {
            if (value == null) return 0;
            try { return Convert.ToDecimal(value, CultureInfo.InvariantCulture); }
            catch
            {
                decimal result;
                return Decimal.TryParse(Clean(value).Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out result) ? result : 0;
            }
        }

        private static DateTime DateValue(object value, DateTime fallback)
        {
            if (value is DateTime) return (DateTime)value;
            DateTime result;
            return DateTime.TryParse(Clean(value), CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out result) ? result : fallback;
        }

        private static void PutDate(Dictionary<string, object> value, string key, object source)
        {
            if (source == null) return;
            DateTime date;
            if (source is DateTime) date = (DateTime)source;
            else if (!DateTime.TryParse(Clean(source), out date)) return;
            value[key] = date.ToUniversalTime().ToString("o");
        }

        public void Close()
        {
            ComAccess.Release(_metadata);
            ComAccess.Release(_session);
            ComAccess.Release(_connector);
            _metadata = null;
            _session = null;
            _connector = null;
            _settings = null;
            GC.Collect();
            GC.WaitForPendingFinalizers();
        }

        public void Dispose()
        {
            Close();
        }
    }

    internal static class ComAccess
    {
        public static object Member(object target, string[] names)
        {
            if (target == null) return null;
            Exception last = null;
            foreach (string name in names)
            {
                try { return target.GetType().InvokeMember(name, BindingFlags.GetProperty, null, target, null); }
                catch (Exception error) { last = error; }
                try { return target.GetType().InvokeMember(name, BindingFlags.InvokeMethod, null, target, new object[0]); }
                catch (Exception error) { last = error; }
            }
            if (last != null) throw last;
            return null;
        }

        public static object Call(object target, string[] names, params object[] arguments)
        {
            if (target == null) throw new NullReferenceException("COM target is empty");
            Exception last = null;
            foreach (string name in names)
            {
                try { return target.GetType().InvokeMember(name, BindingFlags.InvokeMethod, null, target, arguments); }
                catch (Exception error) { last = error; }
            }
            throw last ?? new MissingMethodException(String.Join("/", names));
        }

        public static int Count(object collection)
        {
            object value = Member(collection, new[] { "Count", "Количество" });
            return Convert.ToInt32(value, CultureInfo.InvariantCulture);
        }

        public static object Item(object collection, int index)
        {
            return Call(collection, new[] { "Get", "Получить" }, index);
        }

        public static void Release(object value)
        {
            if (value == null || !Marshal.IsComObject(value)) return;
            try { Marshal.FinalReleaseComObject(value); }
            catch { }
        }
    }
}
