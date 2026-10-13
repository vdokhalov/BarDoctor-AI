// Replace only the external model; request/auth/context/persistence handlers remain real.
export function ownerDoctorMock(){
 const calls=[];
 const runtimeOptions={plugins:[{name:'owner-doctor-model',setup(builder){
  builder.onResolve({filter:/^owner-doctor-test-model$/},()=>({path:'owner-doctor-test-model',external:true}));
  builder.onResolve({filter:/\/ai-provider$/},()=>({path:'owner-doctor-model',namespace:'owner-doctor-test'}));
  builder.onLoad({filter:/.*/,namespace:'owner-doctor-test'},()=>({contents:`export { AIServiceError, aiErrorResponse, parseAIJson } from './lib/bardoctor/anthropic'; export { aiText } from 'owner-doctor-test-model';`,resolveDir:process.cwd(),loader:'ts'}));
 }}],modules:{'owner-doctor-test-model':{aiText:async input=>{calls.push({maxTokens:input.maxTokens});return JSON.stringify({summary:'Isolated mock AI diagnosis'});}}}};
 return {calls,runtimeOptions};
}
