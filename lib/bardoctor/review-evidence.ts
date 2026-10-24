type Row = Record<string, any>;
const row = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
export const REVIEW_ASPECTS = new Set(['staff','kitchen','bar','music','hookah','cleanliness','wait_time','price','atmosphere','other']);
const polarities = new Set(['positive','negative','neutral']);
/** Quotes are source substrings, not model paraphrases. Never infer aspect sentiment from overall sentiment. */
export function reviewTopicEvidence(reviewValue: unknown, supplied?: unknown) {
 const review=row(reviewValue), text=typeof review.text==='string'?review.text:'';
 if(supplied===undefined && review.analysisText!==undefined && review.analysisText!==text)return [];
 const values=supplied===undefined?review.topicEvidence:supplied;
 const result: {reviewId:string;topic:string;sentiment:string;quote:string}[]=[];
 for(const value of Array.isArray(values)?values:[]) {
  const e=row(value);
  if(e.reviewId!==review.id || !REVIEW_ASPECTS.has(e.topic) || !polarities.has(e.sentiment) || typeof e.quote!=='string' || !e.quote.trim() || !text.includes(e.quote)) continue;
  if(!result.some(x=>x.topic===e.topic&&x.sentiment===e.sentiment&&x.quote===e.quote))result.push({reviewId:review.id,topic:e.topic,sentiment:e.sentiment,quote:e.quote});
 }
 return result.filter(e=>!result.some(other=>other.topic===e.topic&&other.quote===e.quote&&other.sentiment!==e.sentiment));
}
export function reviewEvidenceCatalog(reviews: unknown[]) {
 return reviews.flatMap(value=>{const r=row(value);return r.aiStatus==='done'?reviewTopicEvidence(r).map((e,i)=>({...e,id:`review:${encodeURIComponent(r.id)}:${i}`,source:'review',label:e.topic,fact:e.quote})):[];});
}
export function normalizeReviewAnalysis(reviewValue: unknown, supplied: unknown) {
 const review=row(reviewValue), value=row(supplied);
 if(value.id!==review.id || !polarities.has(value.sentiment))return {id:review.id,aiStatus:'failed',sentiment:undefined,topics:[],topicEvidence:[]};
 const topicEvidence=reviewTopicEvidence(review,value.topicEvidence);
 return {id:review.id,aiStatus:'done',sentiment:value.sentiment,topics:[...new Set([...topicEvidence.map(e=>e.topic), ...(Array.isArray(value.topicEvidence)?value.topicEvidence.map((e:unknown)=>row(e).topic).filter((t:unknown)=>typeof t==='string'&&REVIEW_ASPECTS.has(t)):[])])],topicEvidence,analysisText:review.text};
}
const actionLabels: Record<string,string> = {staff:'Проверьте работу команды',kitchen:'Проверьте блюда кухни',bar:'Проверьте напитки',music:'Проверьте музыку',hookah:'Проверьте кальяны',cleanliness:'Проверьте чистоту',wait_time:'Проверьте ожидание заказов',price:'Проверьте цены',atmosphere:'Проверьте обстановку',other:'Разберите замечание гостя'};
export function groundedReviewSummary(value: unknown, reviews: unknown[]) {
 const input=row(value), catalog=reviewEvidenceCatalog(reviews), byId=new Map(catalog.map(e=>[e.id,e]));
 const details=(Array.isArray(input.recommendations)?input.recommendations:[]).flatMap((v:unknown,i:number)=>{
  const item=row(v), ids=Array.isArray(item.evidenceIds)?[...new Set(item.evidenceIds)]:[];
  const evidence=ids.map(id=>byId.get(String(id)));
  // No guessed/general evidence fallback, and no positive quote used as a complaint.
  if(typeof item.title!=='string'||!item.title.trim()||!REVIEW_ASPECTS.has(item.topic)||!ids.length||evidence.some(e=>!e||e.topic!==item.topic||e.sentiment!=='negative'))return [];
  return [{recommendationId:`review-action-${i}`,title:actionLabels[item.topic],topic:item.topic,evidence:evidence as NonNullable<typeof evidence[number]>[]}];
 }).slice(0,8);
 return {recommendations:details.map((e:any)=>e.title),recommendationDetails:details,evidenceStatus:catalog.length?'available':'unverified'};
}
export function reviewInputSignature(reviews: unknown[]) {
 return JSON.stringify(reviews.map(value=>{const r=row(value);return {id:r.id,venueId:r.venueId,text:r.text,publishedAt:r.publishedAt,rating:r.rating,aiStatus:r.aiStatus,sentiment:r.sentiment,topics:r.topics,topicEvidence:r.topicEvidence};}).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
}
