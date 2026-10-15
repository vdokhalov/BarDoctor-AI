import { GET as staffLogin } from '../staff-login/route';
import { barDoctorStartupResponseV411 } from '../bar-doctor-startup-v411';
export function GET(request:Request){
 return new URL(request.url).searchParams.get('management')==='1'?barDoctorStartupResponseV411():staffLogin();
}
