$ErrorActionPreference = 'Stop'
# No command construction or shell interpolation from the ticket/queue name.
$inputJob = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class BarDoctorRawPrinter {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public class DocInfo { [MarshalAs(UnmanagedType.LPWStr)] public string Name="BarDoctor ticket"; [MarshalAs(UnmanagedType.LPWStr)] public string Output=null; [MarshalAs(UnmanagedType.LPWStr)] public string DataType="RAW"; }
 [DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] public static extern bool OpenPrinter(string name,out IntPtr handle,IntPtr defaults);
 [DllImport("winspool.drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] public static extern int StartDocPrinter(IntPtr handle,int level,[In] DocInfo info);
 [DllImport("winspool.drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr handle);
 [DllImport("winspool.drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr handle,byte[] data,int count,out int written);
 [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr handle);
 [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr handle);
 [DllImport("winspool.drv", SetLastError=true)] public static extern bool AbortPrinter(IntPtr handle);
 [DllImport("winspool.drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr handle);
 public static int Send(string queue,byte[] data) {
  IntPtr h; if(!OpenPrinter(queue,out h,IntPtr.Zero)) throw new Exception("OpenPrinter failed");
  bool complete=false;
  try {
   int job=StartDocPrinter(h,1,new DocInfo()); if(job==0) throw new Exception("StartDocPrinter failed");
   if(!StartPagePrinter(h)) throw new Exception("StartPagePrinter failed");
   int written; if(!WritePrinter(h,data,data.Length,out written)||written!=data.Length) throw new Exception("WritePrinter incomplete");
   if(!EndPagePrinter(h)||!EndDocPrinter(h)) throw new Exception("EndDocPrinter failed");
   complete=true; return job;
  } finally { if(!complete) AbortPrinter(h); ClosePrinter(h); }
 }
}
'@
$jobId = [BarDoctorRawPrinter]::Send([string]$inputJob.queue,[Convert]::FromBase64String([string]$inputJob.bytes))
@{status='accepted_by_transport';jobId=$jobId} | ConvertTo-Json -Compress
