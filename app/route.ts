import { barDoctorStartupResponseV411 } from "./bar-doctor-startup-v411";

export function GET(): Promise<Response> {
  return barDoctorStartupResponseV411();
}
