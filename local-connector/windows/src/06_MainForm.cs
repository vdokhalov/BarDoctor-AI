using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading;
using System.Windows.Forms;

namespace BarDoctor.LocalConnector
{
    internal sealed class MainForm : Form
    {
        private readonly ConnectorRuntime _runtime;
        private readonly bool _background;
        private readonly List<Panel> _steps;
        private readonly Label _stepTitle;
        private readonly Label _state;
        private readonly Button _back;
        private readonly Button _next;
        private readonly NotifyIcon _tray;
        private int _step;
        private bool _working;
        private bool _allowClose;

        private TextBox _serverUrl;
        private TextBox _accessKey;
        private Label _serverResult;
        private ComboBox _bases;
        private TextBox _basePath;
        private Label _platformResult;
        private TextBox _onecUser;
        private TextBox _onecPassword;
        private Label _onecResult;
        private CheckedListBox _entities;
        private CheckBox _autoSync;
        private NumericUpDown _interval;
        private NumericUpDown _initialDays;
        private ListView _progress;
        private Label _summary;
        private Button _sync;

        public MainForm(ConnectorRuntime runtime, bool background)
        {
            _runtime = runtime;
            _background = background;
            _steps = new List<Panel>();
            _step = 0;
            _working = false;
            _allowClose = false;

            Text = "BarDoctor Local Connector";
            Icon = SystemIcons.Shield;
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(760, 610);
            Size = new Size(840, 690);
            BackColor = Color.FromArgb(247, 247, 250);
            Font = new Font("Segoe UI", 10F, FontStyle.Regular, GraphicsUnit.Point);

            TableLayoutPanel layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.RowCount = 4;
            layout.ColumnCount = 1;
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 82F));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 45F));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 64F));
            Controls.Add(layout);

            Panel header = new Panel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(22, 24, 46), Padding = new Padding(22, 12, 22, 10) };
            Label brand = new Label { AutoSize = true, ForeColor = Color.FromArgb(165, 169, 199), Text = "BARDOCTOR · LOCAL CONNECTOR", Font = new Font(Font, FontStyle.Bold), Location = new Point(22, 12) };
            _stepTitle = new Label { AutoSize = true, ForeColor = Color.White, Text = "", Font = new Font("Segoe UI", 17F, FontStyle.Bold), Location = new Point(20, 36) };
            header.Controls.Add(brand);
            header.Controls.Add(_stepTitle);
            layout.Controls.Add(header, 0, 0);

            Panel content = new Panel { Dock = DockStyle.Fill, Padding = new Padding(24, 18, 24, 8), AutoScroll = true };
            layout.Controls.Add(content, 0, 1);
            _steps.Add(BuildServerStep());
            _steps.Add(BuildSystemStep());
            _steps.Add(BuildBaseStep());
            _steps.Add(BuildAuthStep());
            _steps.Add(BuildSyncStep());
            foreach (Panel panel in _steps) { panel.Dock = DockStyle.Fill; panel.Visible = false; content.Controls.Add(panel); }

            _state = new Label { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Padding = new Padding(24, 0, 24, 0), ForeColor = Color.FromArgb(86, 87, 108), Text = "Режим: только чтение" };
            layout.Controls.Add(_state, 0, 2);

            FlowLayoutPanel navigation = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft, Padding = new Padding(20, 10, 20, 10), BackColor = Color.White };
            _next = PrimaryButton("Далее");
            _next.Click += delegate { NextStep(); };
            _back = SecondaryButton("Назад");
            _back.Click += delegate { ShowStep(_step - 1); };
            Button hide = SecondaryButton("Свернуть");
            hide.Click += delegate { HideToTray(); };
            navigation.Controls.Add(_next);
            navigation.Controls.Add(_back);
            navigation.Controls.Add(hide);
            layout.Controls.Add(navigation, 0, 3);

            ContextMenuStrip trayMenu = new ContextMenuStrip();
            trayMenu.Items.Add("Открыть", null, delegate { RestoreFromTray(); });
            trayMenu.Items.Add("Синхронизировать сейчас", null, delegate { RestoreFromTray(); BeginSync(); });
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add("Выход", null, delegate { _allowClose = true; Close(); });
            _tray = new NotifyIcon { Icon = SystemIcons.Shield, Text = "BarDoctor Local Connector", Visible = true, ContextMenuStrip = trayMenu };
            _tray.DoubleClick += delegate { RestoreFromTray(); };

            _runtime.ProgressChanged += RuntimeProgress;
            _runtime.StateChanged += RuntimeState;
            LoadSettings();
            ShowStep(0);
            Shown += delegate
            {
                DiscoverBases();
                if (_background && !String.IsNullOrWhiteSpace(_runtime.Settings.ConnectionId)) HideToTray();
            };
            FormClosing += Closing;
        }

        private Panel BuildServerStep()
        {
            FlowLayoutPanel root = VerticalPanel();
            root.Controls.Add(Lead("Шаг 1. Подключение BarDoctor", "Вставьте ключ из раздела «Интеграции → Local Connector». Ключ и пароль 1С хранятся только на этом компьютере."));
            root.Controls.Add(FieldLabel("URL сервера BarDoctor"));
            _serverUrl = TextField(false);
            root.Controls.Add(_serverUrl);
            root.Controls.Add(FieldLabel("Ключ подключения"));
            _accessKey = TextField(true);
            root.Controls.Add(_accessKey);
            Button check = PrimaryButton("Проверить связь с BarDoctor");
            check.Margin = new Padding(0, 12, 0, 6);
            check.Click += delegate { CheckServer(); };
            root.Controls.Add(check);
            _serverResult = ResultLabel();
            root.Controls.Add(_serverResult);
            return Wrap(root);
        }

        private Panel BuildSystemStep()
        {
            FlowLayoutPanel root = VerticalPanel();
            root.Controls.Add(Lead("Шаг 2. Выбор системы", "Первая production-версия поддерживает 1С:Предприятие 8.2 и профиль 1С:Общепит 2.0. Другие адаптеры будут добавляться отдельно."));
            Panel choice = new Panel { Width = 700, Height = 100, BackColor = Color.White, BorderStyle = BorderStyle.FixedSingle, Margin = new Padding(0, 16, 0, 0), Padding = new Padding(18) };
            RadioButton radio = new RadioButton { Checked = true, AutoSize = true, Text = "1С:Предприятие", Font = new Font(Font, FontStyle.Bold), Location = new Point(18, 17) };
            Label copy = new Label { AutoSize = true, Text = "Файловая база · толстый клиент · COM-соединение · только чтение", ForeColor = Color.FromArgb(86, 87, 108), Location = new Point(40, 51) };
            choice.Controls.Add(radio);
            choice.Controls.Add(copy);
            root.Controls.Add(choice);
            return Wrap(root);
        }

        private Panel BuildBaseStep()
        {
            FlowLayoutPanel root = VerticalPanel();
            root.Controls.Add(Lead("Шаг 3. Поиск базы", "Local Connector читает стандартный список информационных баз 1С. Если нужной базы нет в списке, выберите её папку вручную."));
            _platformResult = ResultLabel();
            root.Controls.Add(_platformResult);
            root.Controls.Add(FieldLabel("Обнаруженные информационные базы"));
            _bases = new ComboBox { Width = 700, Height = 34, DropDownStyle = ComboBoxStyle.DropDownList, Margin = new Padding(0, 4, 0, 8) };
            _bases.SelectedIndexChanged += delegate
            {
                InfoBaseDescriptor selected = _bases.SelectedItem as InfoBaseDescriptor;
                if (selected != null) _basePath.Text = selected.Path;
            };
            root.Controls.Add(_bases);
            FlowLayoutPanel scanActions = new FlowLayoutPanel { AutoSize = true, WrapContents = false, Margin = new Padding(0, 0, 0, 8) };
            Button scan = SecondaryButton("Найти базы снова");
            scan.Click += delegate { DiscoverBases(); };
            scanActions.Controls.Add(scan);
            root.Controls.Add(scanActions);
            root.Controls.Add(FieldLabel("Путь к файловой базе"));
            FlowLayoutPanel path = new FlowLayoutPanel { AutoSize = true, WrapContents = false, Margin = new Padding(0, 4, 0, 0) };
            _basePath = TextField(false);
            _basePath.Width = 570;
            Button browse = SecondaryButton("Выбрать папку");
            browse.Click += delegate
            {
                using (FolderBrowserDialog dialog = new FolderBrowserDialog())
                {
                    dialog.Description = "Выберите папку файловой базы 1С";
                    if (Directory.Exists(_basePath.Text)) dialog.SelectedPath = _basePath.Text;
                    if (dialog.ShowDialog(this) == DialogResult.OK) _basePath.Text = dialog.SelectedPath;
                }
            };
            path.Controls.Add(_basePath);
            path.Controls.Add(browse);
            root.Controls.Add(path);
            return Wrap(root);
        }

        private Panel BuildAuthStep()
        {
            FlowLayoutPanel root = VerticalPanel();
            root.Controls.Add(Lead("Шаг 4. Авторизация 1С", "Укажите пользователя 1С, которому разрешено чтение справочников, документов и регистров. Пароль защищается Windows DPAPI и никогда не отправляется в BarDoctor."));
            root.Controls.Add(FieldLabel("Пользователь 1С (если требуется)"));
            _onecUser = TextField(false);
            root.Controls.Add(_onecUser);
            root.Controls.Add(FieldLabel("Пароль 1С (если требуется)"));
            _onecPassword = TextField(true);
            root.Controls.Add(_onecPassword);
            Label defense = new Label { AutoSize = false, Width = 700, Height = 68, Text = "Важно: сам агент содержит только запросы чтения. Для дополнительной защиты используйте отдельного пользователя 1С без прав записи и проведения документов.", ForeColor = Color.FromArgb(122, 75, 16), BackColor = Color.FromArgb(255, 247, 225), Padding = new Padding(12), Margin = new Padding(0, 16, 0, 0) };
            root.Controls.Add(defense);
            return Wrap(root);
        }

        private Panel BuildSyncStep()
        {
            FlowLayoutPanel root = VerticalPanel();
            root.Controls.Add(Lead("Шаг 5. Проверка и синхронизация", "Сначала проверьте базу. После успешной проверки выберите данные и запустите первую синхронизацию вручную."));
            Button test = PrimaryButton("Проверить подключение к 1С");
            test.Click += delegate { TestOneC(); };
            root.Controls.Add(test);
            _onecResult = ResultLabel();
            _onecResult.Height = 56;
            root.Controls.Add(_onecResult);

            _entities = new CheckedListBox { Width = 700, Height = 106, CheckOnClick = true, Margin = new Padding(0, 10, 0, 8) };
            foreach (string entity in ConnectorConstants.EntityOrder) _entities.Items.Add(ConnectorRuntime.EntityLabel(entity), true);
            root.Controls.Add(_entities);

            FlowLayoutPanel settings = new FlowLayoutPanel { AutoSize = true, WrapContents = true, Margin = new Padding(0, 4, 0, 8) };
            _initialDays = new NumericUpDown { Minimum = 1, Maximum = 3650, Value = 365, Width = 74 };
            settings.Controls.Add(new Label { AutoSize = true, Text = "Первая загрузка, дней:", Padding = new Padding(0, 6, 4, 0) });
            settings.Controls.Add(_initialDays);
            _autoSync = new CheckBox { AutoSize = true, Text = "Автоматически", Padding = new Padding(18, 5, 4, 0) };
            settings.Controls.Add(_autoSync);
            _interval = new NumericUpDown { Minimum = 15, Maximum = 1440, Increment = 15, Value = 60, Width = 74 };
            settings.Controls.Add(new Label { AutoSize = true, Text = "каждые", Padding = new Padding(2, 6, 2, 0) });
            settings.Controls.Add(_interval);
            settings.Controls.Add(new Label { AutoSize = true, Text = "мин.", Padding = new Padding(2, 6, 0, 0) });
            root.Controls.Add(settings);

            _sync = PrimaryButton("Синхронизировать сейчас");
            _sync.Click += delegate { BeginSync(); };
            root.Controls.Add(_sync);
            _progress = new ListView { Width = 700, Height = 132, View = View.Details, FullRowSelect = true, GridLines = true, Margin = new Padding(0, 10, 0, 6) };
            _progress.Columns.Add("Сущность", 190);
            _progress.Columns.Add("Прогресс", 110);
            _progress.Columns.Add("Состояние", 370);
            foreach (string entity in ConnectorConstants.EntityOrder)
            {
                ListViewItem item = new ListViewItem(ConnectorRuntime.EntityLabel(entity));
                item.Name = entity;
                item.SubItems.Add("ожидает");
                item.SubItems.Add("Готово к запуску");
                _progress.Items.Add(item);
            }
            root.Controls.Add(_progress);
            _summary = ResultLabel();
            _summary.Height = 52;
            root.Controls.Add(_summary);
            Button log = SecondaryButton("Открыть технический журнал");
            log.Click += delegate
            {
                ConnectorPaths.Ensure();
                if (!File.Exists(ConnectorPaths.Log)) File.WriteAllText(ConnectorPaths.Log, "Журнал пока пуст." + Environment.NewLine);
                Process.Start("notepad.exe", ConnectorPaths.Log);
            };
            root.Controls.Add(log);
            return Wrap(root);
        }

        private void LoadSettings()
        {
            ConnectorSettings value = _runtime.Settings;
            _serverUrl.Text = value.ServerUrl;
            _accessKey.Text = value.AccessKey;
            _basePath.Text = value.InfoBasePath;
            _onecUser.Text = value.OneCUser;
            _onecPassword.Text = value.OneCPassword;
            _autoSync.Checked = value.AutoSync;
            _interval.Value = Math.Max(_interval.Minimum, Math.Min(_interval.Maximum, value.IntervalMinutes));
            _initialDays.Value = Math.Max(_initialDays.Minimum, Math.Min(_initialDays.Maximum, value.InitialSyncDays));
            SetEntity(0, value.ProductsEnabled);
            SetEntity(1, value.SuppliersEnabled);
            SetEntity(2, value.WarehousesEnabled);
            SetEntity(3, value.PurchasesEnabled);
            SetEntity(4, value.StockEnabled);
            if (!String.IsNullOrWhiteSpace(value.ConnectionId))
                Success(_serverResult, "Соединение настроено\r\nЗаведение: " + value.VenueName + " · Источник: " + value.SourceName);
        }

        private void SaveFields()
        {
            ConnectorSettings value = _runtime.Settings;
            string nextServer = _serverUrl.Text.Trim();
            string nextKey = _accessKey.Text.Trim();
            if (!String.Equals(value.ServerUrl, nextServer, StringComparison.OrdinalIgnoreCase)
                || !String.Equals(value.AccessKey, nextKey, StringComparison.Ordinal))
            {
                value.ConnectionId = "";
                value.VenueName = "";
                value.SourceName = "";
            }
            value.ServerUrl = nextServer;
            value.AccessKey = nextKey;
            value.InfoBasePath = _basePath.Text.Trim();
            InfoBaseDescriptor selected = _bases.SelectedItem as InfoBaseDescriptor;
            value.InfoBaseName = selected == null ? Path.GetFileName(value.InfoBasePath.TrimEnd(Path.DirectorySeparatorChar)) : selected.Name;
            value.OneCUser = _onecUser.Text.Trim();
            value.OneCPassword = _onecPassword.Text;
            value.AutoSync = _autoSync.Checked;
            value.IntervalMinutes = Convert.ToInt32(_interval.Value);
            value.InitialSyncDays = Convert.ToInt32(_initialDays.Value);
            value.ProductsEnabled = _entities.GetItemChecked(0);
            value.SuppliersEnabled = _entities.GetItemChecked(1);
            value.WarehousesEnabled = _entities.GetItemChecked(2);
            value.PurchasesEnabled = _entities.GetItemChecked(3);
            value.StockEnabled = _entities.GetItemChecked(4);
            _runtime.Save(value);
        }

        private void CheckServer()
        {
            if (_working) return;
            SaveFields();
            Work("Проверяю связь с BarDoctor…", _serverResult, delegate
            {
                ServerConnectionInfo info = _runtime.CheckBarDoctor(_runtime.Settings);
                Ui(delegate { Success(_serverResult, "Соединение установлено\r\nЗаведение: " + info.VenueName + " · Источник: " + info.SourceName); });
            });
        }

        private void DiscoverBases()
        {
            try
            {
                List<PlatformInstallation> platforms = _runtime.DiscoverPlatforms();
                PlatformInstallation active = platforms.FirstOrDefault(delegate(PlatformInstallation value) { return value.ComAvailable; });
                if (active == null) Failure(_platformResult, "1С 8.2 найдена не полностью: COM-соединение недоступно.");
                else Success(_platformResult, "Платформа: " + active.Version + " · COM-соединение доступно");
                string current = _basePath.Text;
                List<InfoBaseDescriptor> bases = _runtime.DiscoverInfoBases();
                _bases.Items.Clear();
                foreach (InfoBaseDescriptor item in bases) _bases.Items.Add(item);
                int match = bases.FindIndex(delegate(InfoBaseDescriptor item) { return String.Equals(item.Path, current, StringComparison.OrdinalIgnoreCase); });
                if (_bases.Items.Count > 0) _bases.SelectedIndex = match >= 0 ? match : 0;
                if (_bases.Items.Count == 0) _platformResult.Text += "\r\nСписок баз пуст — укажите путь вручную.";
            }
            catch (Exception error) { Failure(_platformResult, FriendlyError.Message(error)); }
        }

        private void TestOneC()
        {
            if (_working) return;
            SaveFields();
            Work("Проверяю базу 1С в режиме чтения…", _onecResult, delegate
            {
                OneCTestResult result = _runtime.TestOneC(_runtime.Settings);
                string message = "Подключение успешно · 1С:Предприятие " + result.PlatformVersion
                    + "\r\nКонфигурация: " + result.ConfigurationName + " " + result.ConfigurationVersion + " · Режим: только чтение";
                if (result.Warnings.Count > 0) message += "\r\n" + String.Join(" ", result.Warnings.ToArray());
                Ui(delegate { Success(_onecResult, message); });
            });
        }

        private void BeginSync()
        {
            if (_working || _runtime.IsSyncing) return;
            SaveFields();
            Work("Выполняется синхронизация…", _summary, delegate
            {
                SyncSummary result = _runtime.SynchronizeNow();
                string message = "Синхронизация завершена · получено " + result.Received
                    + " · создано " + result.Created + " · обновлено " + result.Updated
                    + " · пропущено " + result.Skipped + " · ошибки " + result.Errors;
                if (result.Messages.Count > 0) message += "\r\n" + String.Join(" ", result.Messages.Take(3).ToArray());
                Ui(delegate
                {
                    if (result.Errors > 0) Failure(_summary, message); else Success(_summary, message);
                });
            });
        }

        private void Work(string state, Label errorTarget, Action action)
        {
            _working = true;
            SetBusy(true);
            _state.Text = state;
            Thread thread = new Thread(delegate()
            {
                try { action(); }
                catch (Exception error)
                {
                    ConnectorLog.Error(state, error);
                    Ui(delegate { Failure(errorTarget, FriendlyError.Message(error)); _state.Text = FriendlyError.Message(error); });
                }
                finally { Ui(delegate { _working = false; SetBusy(false); }); }
            });
            thread.IsBackground = true;
            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
        }

        private void RuntimeProgress(EntitySyncProgress progress)
        {
            Ui(delegate
            {
                ListViewItem item = _progress.Items[progress.EntityType];
                if (item == null) return;
                item.SubItems[1].Text = progress.Total > 0
                    ? progress.Current + " / " + progress.Total
                    : progress.Current > 0 ? progress.Current + " / …" : "ожидает";
                item.SubItems[2].Text = progress.Message;
            });
        }

        private void RuntimeState(string value)
        {
            Ui(delegate { _state.Text = value; });
        }

        private void Ui(Action action)
        {
            if (IsDisposed) return;
            if (InvokeRequired) BeginInvoke(action); else action();
        }

        private void SetBusy(bool value)
        {
            _next.Enabled = !value;
            _back.Enabled = !value && _step > 0;
            _sync.Enabled = !value;
            UseWaitCursor = value;
        }

        private void NextStep()
        {
            SaveFields();
            if (_step == 0 && String.IsNullOrWhiteSpace(_runtime.Settings.ConnectionId))
            {
                Failure(_serverResult, "Сначала проверьте связь с BarDoctor.");
                return;
            }
            if (_step == 2 && String.IsNullOrWhiteSpace(_basePath.Text))
            {
                Failure(_platformResult, "Выберите информационную базу 1С.");
                return;
            }
            if (_step < _steps.Count - 1) ShowStep(_step + 1);
        }

        private void ShowStep(int value)
        {
            _step = Math.Max(0, Math.Min(_steps.Count - 1, value));
            for (int index = 0; index < _steps.Count; index++) _steps[index].Visible = index == _step;
            string[] titles = { "Подключение BarDoctor", "Выбор системы", "Поиск базы 1С", "Авторизация", "Проверка и синхронизация" };
            _stepTitle.Text = (_step + 1) + " из 5 · " + titles[_step];
            _back.Enabled = _step > 0 && !_working;
            _next.Visible = _step < _steps.Count - 1;
            _next.Text = "Далее";
            _steps[_step].BringToFront();
        }

        private void HideToTray()
        {
            Hide();
            ShowInTaskbar = false;
            _tray.ShowBalloonTip(1500, "BarDoctor Local Connector", "Агент продолжает работать и повторит отправку после восстановления интернета.", ToolTipIcon.Info);
        }

        private void RestoreFromTray()
        {
            ShowInTaskbar = true;
            Show();
            WindowState = FormWindowState.Normal;
            Activate();
        }

        private void Closing(object sender, FormClosingEventArgs eventArgs)
        {
            if (!_allowClose && eventArgs.CloseReason == CloseReason.UserClosing)
            {
                eventArgs.Cancel = true;
                HideToTray();
                return;
            }
            _tray.Visible = false;
            _tray.Dispose();
            _runtime.Dispose();
        }

        private void SetEntity(int index, bool value)
        {
            if (index < _entities.Items.Count) _entities.SetItemChecked(index, value);
        }

        private static Panel Wrap(Control child)
        {
            Panel panel = new Panel { AutoScroll = true };
            panel.Controls.Add(child);
            return panel;
        }

        private static FlowLayoutPanel VerticalPanel()
        {
            return new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, FlowDirection = FlowDirection.TopDown, WrapContents = false, Padding = new Padding(0, 0, 12, 18) };
        }

        private static Panel Lead(string title, string copy)
        {
            Panel panel = new Panel { Width = 710, Height = 82, Margin = new Padding(0, 0, 0, 10) };
            panel.Controls.Add(new Label { AutoSize = true, Text = title, Font = new Font("Segoe UI", 15F, FontStyle.Bold), Location = new Point(0, 0), ForeColor = Color.FromArgb(31, 32, 52) });
            panel.Controls.Add(new Label { AutoSize = false, Width = 700, Height = 45, Text = copy, Location = new Point(0, 34), ForeColor = Color.FromArgb(86, 87, 108) });
            return panel;
        }

        private static Label FieldLabel(string value)
        {
            return new Label { AutoSize = true, Text = value, Font = new Font("Segoe UI", 9F, FontStyle.Bold), Margin = new Padding(0, 8, 0, 0), ForeColor = Color.FromArgb(49, 50, 70) };
        }

        private static TextBox TextField(bool secret)
        {
            return new TextBox { Width = 700, Height = 32, UseSystemPasswordChar = secret, Margin = new Padding(0, 4, 0, 4) };
        }

        private static Button PrimaryButton(string value)
        {
            return new Button { AutoSize = true, Height = 38, Text = value, BackColor = Color.FromArgb(85, 65, 214), ForeColor = Color.White, FlatStyle = FlatStyle.Flat, Padding = new Padding(14, 4, 14, 4), Margin = new Padding(5, 0, 0, 0), UseVisualStyleBackColor = false };
        }

        private static Button SecondaryButton(string value)
        {
            return new Button { AutoSize = true, Height = 38, Text = value, BackColor = Color.White, ForeColor = Color.FromArgb(49, 50, 70), FlatStyle = FlatStyle.Flat, Padding = new Padding(12, 4, 12, 4), Margin = new Padding(5, 0, 0, 0), UseVisualStyleBackColor = false };
        }

        private static Label ResultLabel()
        {
            return new Label { AutoSize = false, Width = 700, Height = 46, Text = "", Padding = new Padding(10), Margin = new Padding(0, 6, 0, 0), ForeColor = Color.FromArgb(86, 87, 108) };
        }

        private static void Success(Label label, string value)
        {
            label.Text = value;
            label.ForeColor = Color.FromArgb(27, 105, 67);
            label.BackColor = Color.FromArgb(231, 248, 239);
        }

        private static void Failure(Label label, string value)
        {
            label.Text = value;
            label.ForeColor = Color.FromArgb(150, 48, 48);
            label.BackColor = Color.FromArgb(255, 235, 235);
        }
    }
}
