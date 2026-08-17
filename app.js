function syncViewportHeight(){const viewportHeight=window.visualViewport?.height||window.innerHeight;document.documentElement.style.setProperty('--app-height',`${Math.round(viewportHeight)}px`);}
syncViewportHeight();
window.addEventListener('resize',syncViewportHeight);
window.addEventListener('orientationchange',()=>setTimeout(syncViewportHeight,160));
window.visualViewport?.addEventListener('resize',syncViewportHeight);

const animals={
  bear:{badge:'숲 친구',name:'반달가슴곰',message:'“조용하고 깨끗한 숲이 나의 집이에요. 나무와 숲길을 잘 지켜 주세요.”',question:'반달가슴곰이 살기 좋은 숲을 만들려면 무엇이 필요할까요?',speech:'나는 반달가슴곰이야. 조용하고 깨끗한 숲이 좋아.',video:'video-bear'},
  deer:{badge:'숲 친구',name:'노루',message:'“풀과 나무가 있는 안전한 숲이 나의 집이에요. 조용하고 편안한 보금자리를 지켜 주세요.”',question:'노루가 편하게 지낼 수 있는 숲에는 무엇이 필요할까요?',speech:'나는 노루야. 풀과 나무가 있는 안전한 숲이 좋아.',video:'video-deer'},
  otter:{badge:'물가 친구',name:'수달',message:'“맑은 물과 안전한 물가가 필요해요. 쓰레기 없는 물길을 함께 지켜요.”',question:'수달이 살 물을 깨끗하게 하려면 우리는 무엇을 할 수 있을까요?',speech:'나는 수달이야. 맑은 물이 필요해.',video:'video-otter'}
};

const $=(s)=>document.querySelector(s);
const startScreen=$('#start-screen');
const startButton=$('#start-button');
const statusPill=$('#status-pill');
const scanGuide=$('#scan-guide');
const helpPanel=$('#help-panel');
const animalCard=$('#animal-card');

function setStatus(text,guideHidden=false){statusPill.textContent=text;scanGuide.classList.toggle('hidden',guideHidden);}

async function warmUpVideos(){
  const videos=document.querySelectorAll('video');
  for(const video of videos){
    video.muted=true;
    video.playsInline=true;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    try{
      await video.play();
      video.pause();
      video.currentTime=0;
    }catch(e){
      console.warn('video warmup failed', video.id, e);
    }
  }
}

async function playAnimalVideo(key){
  const animal=animals[key];
  if(!animal) return;
  const video=document.getElementById(animal.video);
  if(!video) return;
  try{
    video.currentTime=0;
    await video.play();
  }catch(e){
    console.warn('video play failed', animal.video, e);
    setStatus('영상 재생 권한을 준비 중이에요. 화면을 한 번 터치한 뒤 다시 표찰을 비춰 주세요.', false);
  }
}

function pauseOtherVideos(activeKey){
  Object.keys(animals).forEach((key)=>{
    if(key!==activeKey){
      const v=document.getElementById(animals[key].video);
      if(v){ v.pause(); }
    }
  });
}

function showAnimal(key){
  const animal=animals[key];
  if(!animal)return;
  pauseOtherVideos(key);
  playAnimalVideo(key);
  $('#animal-badge').textContent=animal.badge;
  $('#animal-name').textContent=animal.name;
  $('#animal-message').textContent=animal.message;
  $('#animal-question').textContent=animal.question;
  animalCard.classList.remove('hidden');
  helpPanel.classList.add('hidden');
  setStatus(`${animal.name} 친구가 나타났어요. 작품을 함께 살펴볼까요?`,true);
  if('speechSynthesis'in window){
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(animal.speech);
    utterance.lang='ko-KR';
    utterance.rate=0.9;
    window.speechSynthesis.speak(utterance);
  }
}

startButton.addEventListener('click',async()=>{
  await warmUpVideos();
  startScreen.classList.add('hidden');
  setStatus('카메라를 허용하고 작품에 붙인 AR 표찰을 비춰 주세요.',false);
});

$('#help-button').addEventListener('click',()=>{helpPanel.classList.toggle('hidden');animalCard.classList.add('hidden');});
document.querySelectorAll('.panel-close').forEach((button)=>{button.addEventListener('click',()=>{helpPanel.classList.add('hidden');animalCard.classList.add('hidden');});});

const markerMap={'marker-bear':'bear','marker-deer':'deer','marker-otter':'otter'};
Object.keys(markerMap).forEach((id)=>{
  const marker=document.getElementById(id);
  marker.addEventListener('markerFound',()=>{showAnimal(markerMap[id]);});
  marker.addEventListener('markerLost',()=>{
    const key=markerMap[id];
    const v=document.getElementById(animals[key].video);
    if(v){ v.pause(); }
    animalCard.classList.add('hidden');
    setStatus('다른 작품의 AR 표찰도 비춰 보세요.',false);
  });
});

document.querySelectorAll('[data-animal]').forEach((entity)=>{entity.addEventListener('click',()=>showAnimal(entity.dataset.animal));});

window.addEventListener('error',(event)=>{
  if(String(event.message||'').toLowerCase().includes('camera')){
    setStatus('카메라를 사용할 수 없어요. 브라우저 권한과 HTTPS 주소를 확인해 주세요.',false);
  }
});
