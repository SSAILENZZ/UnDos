const TIME_ZONE='America/Santiago';
const pad=n=>String(n).padStart(2,'0');

function chileParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=type=>parts.find(p=>p.type===type)?.value;
  return {year:Number(get('year')),month:Number(get('month')),day:Number(get('day'))};
}
function chileDate(date=new Date()){const p=chileParts(date);return `${p.year}-${pad(p.month)}-${pad(p.day)}`}
function chileMonth(date=new Date()){return chileDate(date).slice(0,7)}
function chileYear(date=new Date()){return chileParts(date).year}
function validDate(value){
  const s=String(value||''),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;
  const y=Number(m[1]),month=Number(m[2]),day=Number(m[3]);if(y<1900||y>2200||month<1||month>12||day<1||day>31)return false;
  const d=new Date(Date.UTC(y,month-1,day));
  return d.getUTCFullYear()===y&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;
}
function validMonth(value){const s=String(value||''),m=s.match(/^(\d{4})-(\d{2})$/);return !!m&&Number(m[1])>=1900&&Number(m[1])<=2200&&Number(m[2])>=1&&Number(m[2])<=12}
function monthRange(month){
  if(!validMonth(month))throw new Error('Mes inválido');
  const [year,mo]=month.split('-').map(Number),start=new Date(Date.UTC(year,mo-1,1)),end=new Date(Date.UTC(year,mo,1));
  return [start.toISOString().slice(0,10),end.toISOString().slice(0,10)];
}
module.exports={TIME_ZONE,chileParts,chileDate,chileMonth,chileYear,validDate,validMonth,monthRange};
