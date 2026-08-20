using System;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace BarDoctor.LocalConnector
{
    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            bool created;
            using (Mutex singleInstance = new Mutex(true, "BarDoctor.LocalConnector.1.0", out created))
            {
                if (!created) return;
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                bool background = args != null && Array.Exists(args, delegate(string value)
                {
                    return String.Equals(value, "--background", StringComparison.OrdinalIgnoreCase);
                });
                ConnectorRuntime runtime = new ConnectorRuntime();
                Application.Run(new MainForm(runtime, background));
            }
        }
    }
}
