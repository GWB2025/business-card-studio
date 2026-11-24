'use strict';
const $=id=>document.getElementById(id),STORAGE='card-studio-draft-v1';
let design={...CardEngine.defaults},fonts=[],result=null,svgUrl=null,zoom=100,toastTimer;
const numeric=new Set(['width','height','margin','nameSize','bodySize','stroke','density','twist']);
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function syncControls(){
 for(const el of document.querySelectorAll('[data-key]')){
  const value=design[el.dataset.key];if(el.type==='checkbox')el.checked=value;else el.value=value;
 }
 const format=design.width+','+design.height;
 $('format').value=[...$('format').options].some(o=>o.value===format)?format:'custom';
 $('width').readOnly=$('height').readOnly=$('format').value!=='custom';
 for(const button of document.querySelectorAll('[data-motif]')){const active=button.dataset.motif===design.motif;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 for(const button of document.querySelectorAll('[data-colour]')){const active=button.dataset.colour.toLowerCase()===design.colour.toLowerCase();button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
 $('prompt-label').hidden=!design.showNfc;
 $('twist').disabled=design.motif==='orbit';
}
function render(){
 for(const key of ['density','twist','bodySize'])$(key+'-out').textContent=design[key]+(key==='bodySize'?' mm':'');
 $('prompt-label').hidden=!design.showNfc;
 $('twist').disabled=design.motif==='orbit';
 try{
  const next=CardEngine.build(design,fonts);result=next;
  $('chip-position').hidden = !design.showNfc || !CardEngine.isChipCard(design);
  const chipGuide = $('chip-guide');
  chipGuide.hidden = !next.chip;
  if (next.chip) {
   const chip = next.chip;
   chipGuide.style.left = 100 * (chip.x - chip.width / 2) / design.width + '%';
   chipGuide.style.top = 100 * (chip.y - chip.height / 2) / design.height + '%';
   chipGuide.style.width = 100 * chip.width / design.width + '%';
   chipGuide.style.height = 100 * chip.height / design.height + '%';
  }
  $('artwork').innerHTML=next.svg;
  $('dimensions').textContent=`${design.width} × ${design.height} mm`;
  $('width-label').textContent=design.width+' mm';
  $('card-wrap').style.maxWidth=design.width<design.height?'420px':'710px';
  $('card-wrap').style.width=design.width<design.height?'65%':'100%';
  const guide=$('safe-guide');guide.style.left=guide.style.right=100*design.margin/design.width+'%';guide.style.top=guide.style.bottom=100*design.margin/design.height+'%';
  $('path-count').textContent=next.paths.length.toLocaleString();$('path-length').textContent=(next.length/1000).toFixed(2)+' m';
  $('feedback').className='feedback'+(next.warnings.length?' warning':'');
  $('feedback').textContent=next.warnings.length?next.warnings.join(' '):'All set. Your artwork sits inside the safe area.';
  for(const id of ['export','export-top','share','save-design'])$(id).disabled=false;
  if(svgUrl)URL.revokeObjectURL(svgUrl);svgUrl=URL.createObjectURL(new Blob([next.svg],{type:'image/svg+xml'}));$('open-svg').href=svgUrl;
  try{localStorage.setItem(STORAGE,JSON.stringify({format:'card-studio',version:1,design}));$('saved-status').textContent='Draft saved in this browser';}catch{$('saved-status').textContent='Use Save design to keep a copy';}
 }catch(error){
  result=null;$('feedback').className='feedback error';$('feedback').textContent=error.message;
  for(const id of ['export','export-top','share','save-design'])$(id).disabled=true;
  $('open-svg').removeAttribute('href');
 }
}
function filename(extension){return (design.name.trim()||'my-card').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,55)+'-'+design.width+'x'+design.height+'mm.'+extension;}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function exportSvg(){if(result){download(new Blob([result.svg],{type:'image/svg+xml'}),filename('svg'));toast('SVG ready. Plot at actual size (100%).');}}
for(const id of ['export','export-top'])$(id).addEventListener('click',exportSvg);
$('share').addEventListener('click',async()=>{
 if(!result)return;
 const file=new File([result.svg],filename('svg'),{type:'image/svg+xml'});
 try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'My business card'});}else{exportSvg();toast('Use Download SVG or Open SVG to save the file.');}}
 catch(error){if(error.name!=='AbortError')toast('Sharing is unavailable. Use Download SVG or Open SVG instead.');}
});
for(const el of document.querySelectorAll('[data-key]'))el.addEventListener('input',()=>{
 const key=el.dataset.key;design[key]=el.type==='checkbox'?el.checked:numeric.has(key)?Number(el.value):el.value;
 if(key==='colour')for(const button of document.querySelectorAll('[data-colour]')){const active=button.dataset.colour===design.colour;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
 render();
});
$('format').addEventListener('change',()=>{
 if($('format').value==='custom'){$('width').readOnly=$('height').readOnly=false;return;}
 if($('format').value!=='custom')[design.width,design.height]=$('format').value.split(',').map(Number);
 syncControls();render();
});
for(const button of document.querySelectorAll('[data-motif]'))button.addEventListener('click',()=>{design.motif=button.dataset.motif;syncControls();render();});
for(const button of document.querySelectorAll('[data-colour]'))button.addEventListener('click',()=>{design.colour=button.dataset.colour;syncControls();render();});
$('variation').addEventListener('click',()=>{design.phase=(design.phase+37)%360;render();});
$('plastic').addEventListener('change',()=>{$('card-wrap').classList.toggle('plastic',$('plastic').checked);});
$('show-guide').addEventListener('change',()=>{$('layout-guides').hidden=!$('show-guide').checked;});
function zoomTo(value){zoom=Math.max(70,Math.min(130,value));$('card-wrap').style.transform=`scale(${zoom/100})`;$('zoom-value').textContent=zoom+'%';$('zoom-out').disabled=zoom===70;$('zoom-in').disabled=zoom===130;}
$('zoom-out').addEventListener('click',()=>zoomTo(zoom-10));$('zoom-in').addEventListener('click',()=>zoomTo(zoom+10));
$('save-design').addEventListener('click',()=>{if(!result)return;download(new Blob([JSON.stringify({format:'card-studio',version:1,design},null,2)],{type:'application/json'}),filename('json'));toast('Design saved. Open this JSON file to edit it later.');});
$('load-design').addEventListener('click',()=>$('design-file').click());
$('design-file').addEventListener('change',async()=>{
 const file=$('design-file').files[0];if(!file)return;
 try{
  if(file.size>100000)throw Error('Choose a Card Studio JSON design smaller than 100 KB.');
  const saved=JSON.parse(await file.text());if(saved.format!=='card-studio'||saved.version!==1)throw Error('Choose a JSON design saved by Card Studio.');
  const incoming=CardEngine.validate(saved.design);CardEngine.build(incoming,fonts);design=incoming;syncControls();render();toast('Design opened.');
 }catch(error){toast(error instanceof SyntaxError?'This file is not a valid JSON design.':error.message);}
 $('design-file').value='';
});
let beforeReset=null;
$('reset').addEventListener('click',()=>{
 if(beforeReset){design=beforeReset;beforeReset=null;$('reset').textContent='Reset';toast('Previous design restored.');}
 else{beforeReset={...design};design={...CardEngine.defaults};$('reset').textContent='Undo reset';toast('Default design restored. Choose Undo reset to go back.');}
 syncControls();render();
});
async function init(){
 try{
  const response=await fetch('fonts.json');if(!response.ok)throw Error('The fonts could not be loaded. Please reload the app.');fonts=await response.json();
  for(const font of fonts){const option=document.createElement('option');option.value=font.id;option.textContent=font.name;$('font').append(option);}
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved?.format==='card-studio'&&saved.version===1){const candidate=CardEngine.restoreDraft(saved.design);CardEngine.build(candidate,fonts);design=candidate;}}catch{toast('Started a fresh design. You can open a saved JSON backup.');}
  syncControls();render();
 }catch(error){$('feedback').textContent=error.message;$('feedback').className='feedback error';}
}
init();
