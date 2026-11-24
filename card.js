(function(root){
 'use strict';
 const defaults={name:'GORDON',subtitle:'MATHEMATICS\nMAKING · ART',contact:'',prompt:'TAP TO CONNECT',showNfc:true,width:85,height:54,margin:4,font:'sans',nameSize:6,bodySize:2.2,stroke:.45,colour:'#000000',motif:'vortex',density:19,twist:2.2,phase:0};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function validate(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Choose a saved Card Studio design.');
  const d={...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>Object.hasOwn(input,k)).map(k=>[k,input[k]]))};
  for(const [key,min,max] of [['width',45,180],['height',35,120],['margin',2,12],['nameSize',3,10],['bodySize',1.5,4],['stroke',.2,1.2],['density',8,32],['twist',0,4],['phase',0,360]]){
   if(typeof d[key]!=='number'||!Number.isFinite(d[key])||d[key]<min||d[key]>max)throw Error(`Check ${key}: use ${min}–${max}.`);
  }
  if(d.margin*2>=Math.min(d.width,d.height)*.6)throw Error('The margin leaves too little room for this card.');
  if(!['vortex','waves','orbit'].includes(d.motif)||!/^#[0-9a-f]{6}$/i.test(d.colour)||typeof d.showNfc!=='boolean')throw Error('Choose valid pattern and pen settings.');
  for(const key of ['name','subtitle','contact','prompt'])if(typeof d[key]!=='string'||d[key].length>240||/[\u0000-\u0008\u000b-\u001f]/.test(d[key]))throw Error('Keep each text field under 240 characters.');
  return d;
 }
 function clip(a,b,box){
  let lo=0,hi=1;const dx=b[0]-a[0],dy=b[1]-a[1];
  const p=[-dx,dx,-dy,dy],q=[a[0]-box[0],box[2]-a[0],a[1]-box[1],box[3]-a[1]];
  for(let i=0;i<4;i++){
   if(Math.abs(p[i])<1e-12){if(q[i]<0)return null;continue;}
   const r=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);if(lo>hi)return null;
  }
  return [[a[0]+lo*dx,a[1]+lo*dy],[a[0]+hi*dx,a[1]+hi*dy]];
 }
 function clipPaths(paths,box){
  const out=[];
  for(const path of paths){let current=[];
   const flush=()=>{if(current.length>1&&current.reduce((s,p,i)=>s+(i?Math.hypot(p[0]-current[i-1][0],p[1]-current[i-1][1]):0),0)>.25)out.push(current);current=[];};
   for(let i=1;i<path.length;i++){
    const segment=clip(path[i-1],path[i],box);
    if(!segment){flush();continue;}
    if(current.length&&Math.hypot(current.at(-1)[0]-segment[0][0],current.at(-1)[1]-segment[0][1])>.001)flush();
    if(!current.length)current.push(segment[0]);current.push(segment[1]);
   }flush();
  }return out;
 }
 function motif(d){
  const paths=[],count=Math.round(d.density),left=d.width*.56,right=d.width-d.margin,top=d.margin,bottom=d.height-d.margin;
  const cx=left+(right-left)*.62,cy=top+(bottom-top)*.59,phase=d.phase*Math.PI/180;
  if(d.motif==='vortex'){
   const inner=Math.max(2.5,count*(d.stroke+.55)/(2*Math.PI)),outer=Math.hypot(d.width,d.height);
   for(let i=0;i<count;i++){const line=[];for(let j=0;j<=260;j++){
    const t=j/260,r=inner+t*outer,theta=i/count*2*Math.PI+phase+d.twist*Math.exp(-t*5);
    line.push([cx+r*Math.cos(theta),cy+r*Math.sin(theta)]);
   }paths.push(line);}
  }else if(d.motif==='waves'){
   for(let i=0;i<count;i++){const line=[];for(let j=0;j<=150;j++){
    const t=j/150,y=top+t*(bottom-top),x=left-10+i*(right-left+20)/(count-1)+Math.sin(t*Math.PI*2+phase)*(2+d.twist*2.1);
    line.push([x,y]);
   }paths.push(line);}
  }else{
   for(let i=0;i<count;i++){const line=[],r=2.5+i*1.9;for(let j=0;j<=200;j++){
    const a=j/200*Math.PI*2,dx=r*Math.cos(a),dy=r*.72*Math.sin(a),angle=.45+phase;
    line.push([cx+dx*Math.cos(angle)-dy*Math.sin(angle),cy+dx*Math.sin(angle)+dy*Math.cos(angle)]);
   }paths.push(line);}
  }
  return clipPaths(paths,[left,top,right,bottom]);
 }
 function textPaths(text,font,x,y,size,maxWidth,warnings,label){
  if(!text.trim())return {paths:[],height:0,size};
  const lines=text.replace(/\r\n?/g,'\n').normalize('NFC').replace(/[’‘]/g,"'").split('\n');
  if(lines.length>4)throw Error(`${label}: use at most four lines.`);
  const glyph=c=>{if(!font.glyphs[c])throw Error(`This font cannot draw “${c}”. Choose another font or change the text.`);return font.glyphs[c];};
  const widths=lines.map(line=>[...line].reduce((sum,c)=>sum+glyph(c).advance,0));
  const requested=size,scale=Math.min(size/font.cap_height,maxWidth/Math.max(1,...widths));
  size=scale*font.cap_height;if(size<requested-.05)warnings.push(`The ${label.toLowerCase()} was reduced to ${size.toFixed(1)} mm to fit.`);
  if(size<1.7)warnings.push(`The ${label.toLowerCase()} may be too small for a Sharpie. Shorten it or use fewer lines.`);
  const paths=[];
  lines.forEach((line,index)=>{let pen=x;for(const c of line){const g=glyph(c);for(const path of g.paths)paths.push(path.map(([gx,gy])=>[pen+gx*scale,y+size+index*size*1.6-gy*scale]));pen+=g.advance*scale;}});
  const minX=Math.min(x,...paths.flat().map(p=>p[0])),maxX=Math.max(x,...paths.flat().map(p=>p[0]));
  if(maxX-minX>maxWidth+.01){const f=maxWidth/(maxX-minX);for(const path of paths)for(const p of path)p[0]=x+(p[0]-minX)*f;}
  return {paths,height:size*(1+(lines.length-1)*1.6),size};
 }
 function build(input,fonts){
  const d=validate(input),font=fonts.find(f=>f.id===d.font);if(!font)throw Error('Choose an available stroke font.');
  const warnings=[],paths=motif(d),area=[d.margin,d.margin,d.width-d.margin,d.height-d.margin];
  const textWidth=d.width*.53-d.margin-1.5,x=d.margin;
  const nameY=d.height*.29;
  const name=textPaths(d.name,font,x,nameY,d.nameSize,textWidth,warnings,'Name');paths.push(...name.paths);
  const subtitle=textPaths(d.subtitle,font,x,nameY+name.height+3.5,d.bodySize,textWidth,warnings,'Subtitle');paths.push(...subtitle.paths);
  const contactY=nameY+name.height+subtitle.height+8;
  const contact=textPaths(d.contact,font,x,contactY,d.bodySize,textWidth,warnings,'Contact');paths.push(...contact.paths);
  const promptY=d.height-d.margin-6.5;
  if(d.contact.trim()&&contactY+contact.height>promptY-2)warnings.push('Contact details are close to the tap prompt. Use fewer lines or smaller text.');
  if(d.showNfc){
   const prompt=textPaths(d.prompt,font,x,promptY,Math.min(2.1,d.bodySize),textWidth-7,warnings,'Tap prompt');paths.push(...prompt.paths);
   for(const radius of [1.5,2.6,3.7]){const line=[];for(let j=0;j<=24;j++){const a=-.8+j/24*1.6;line.push([d.width*.53-4+radius*Math.cos(a),promptY+1+radius*Math.sin(a)]);}paths.push(line);}
  }
  if(d.stroke>.7)warnings.push('A broad pen may close up small lettering. Try a physical test before making a batch.');
  let clipped=false;
  for(const p of paths.flat())if(p[0]<area[0]-.01||p[0]>area[2]+.01||p[1]<area[1]-.01||p[1]>area[3]+.01)clipped=true;
  if(clipped)warnings.push('Some text reaches the safe margin. Shorten the text or reduce its size.');
  const safe=clipPaths(paths,area);let length=0;for(const path of safe)for(let i=1;i<path.length;i++)length+=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);
  const stroke=path=>'M '+path.map(([x,y])=>x.toFixed(3)+','+y.toFixed(3)).join(' L ');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}mm" height="${d.height}mm" viewBox="0 0 ${d.width} ${d.height}"><title>${escape(d.name||'Business card')} — Card Studio</title><desc>Plot at actual size. Transparent background. All lettering is pen paths. ${d.width} × ${d.height} mm; ${d.margin} mm safe margin.</desc><g fill="none" stroke="${d.colour}" stroke-width="${d.stroke}" stroke-linecap="round" stroke-linejoin="round">${safe.map(p=>'<path d="'+stroke(p)+'"/>').join('')}</g></svg>`;
  return {svg,paths:safe,length,warnings:[...new Set(warnings)],design:d};
 }
 const api={defaults,validate,build};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CardEngine=api;
})(typeof window==='undefined'?globalThis:window);
