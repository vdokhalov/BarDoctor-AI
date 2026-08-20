import { barDoctorResponse } from "../bar-doctor-response";

export function GET(): Response {
  return barDoctorResponse();
}
