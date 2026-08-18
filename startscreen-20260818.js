function syncViewportHeight(){
  const h = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
}
syncViewportHeight();
window.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('resize', syncViewportHeight);
window.addEventListener('orientationchange', () => setTimeout(syncViewportHeight, 250));

const animals = {
  bear: { name:'반달가슴곰', image:'assets/animals/bear.png', video:'assets/videos/bear.webm', message:'반달가슴곰이 살 숲 위를 터치해 보세요.' },
  deer: { name:'노루', image:'assets/animals/deer.png', video:'assets/videos/deer.webm', message:'노루가 쉴 풀밭이나 숲 위를 터치해 보세요.' },
  otter: { name:'수달', image:'assets/animals/otter.png', video:'assets/videos/otter.webm', message:'수달이 살 물가나 강 위를 터치해 보세요.' }
};

const $ = (selector) => document.querySelector(selector);
const camera = $('#camera');
const startScreen = $('#start-screen');
const topbar = $('#topbar');
const controls = $('#controls');
const bottomGuide = $('#bottom-guide');
const stage = $('#stage');
const animalImage = $('#animal-image');
const animalVideo = $('#animal-video');
const message = $('#message');

let currentAnimal = 'bear';
let currentMode = 'image';
let scale = 1;
let stream = null;
let cameraStarted = false;

function setMessage(text){ message.textContent = text; }

function setAnimal(key){
  currentAnimal = key;
  const data = animals[key];
  animalImage.src = data.image;
  animalImage.alt = data.name;
  animalVideo.pause();
  animalVideo.removeAttribute('src');
  animalVideo.load();
  stage.classList.remove('video-mode');
  if(currentMode === 'video') prepareVideo();
  setMessage(`${data.name} 선택됨. ${data.message}`);
  document.querySelectorAll('.animal-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.animal === key));
}

function setMode(mode){
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.mode === mode));
  if(mode === 'video'){
    prepareVideo();
    stage.classList.add('video-mode');
    setMessage('영상 모드입니다. 버벅이면 사진 모드로 바꾸세요.');
  } else {
    animalVideo.pause();
    stage.classList.remove('video-mode');
    setMessage(`${animals[currentAnimal].name} 사진 모드입니다. 작품 위를 터치하세요.`);
  }
}

function prepareVideo(){
  const data = animals[currentAnimal];
  if(animalVideo.getAttribute('src') !== data.video){
    animalVideo.src = data.video;
    animalVideo.muted = true;
    animalVideo.loop = true;
    animalVideo.playsInline = true;
    animalVideo.setAttribute('playsinline', '');
    animalVideo.setAttribute('webkit-playsinline', '');
    animalVideo.load();
  }
  animalVideo.play().catch(() => setMessage('영상 재생이 무거우면 사진 모드를 사용하세요.'));
}

function placeAt(clientX, clientY){
  if(!cameraStarted) return;
  const controlRect = controls.getBoundingClientRect();
  const bottomRect = bottomGuide.getBoundingClientRect();
  if(clientY < controlRect.bottom + 6 || clientY > bottomRect.top - 6) return;
  stage.style.left = `${clientX}px`;
  stage.style.top = `${clientY}px`;
  stage.classList.remove('hidden');
  if(currentMode === 'video') prepareVideo();
  setMessage(`${animals[currentAnimal].name}이/가 보금자리에 나타났어요.`);
}

function centerAnimal(){ placeAt(window.innerWidth / 2, window.innerHeight / 2); }

async function startCamera(){
  if(cameraStarted) return;
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 540 } },
      audio: false
    });
    camera.srcObject = stream;
    camera.classList.add('on');
    await camera.play();
    cameraStarted = true;
    startScreen.classList.add('hidden');
    topbar.classList.remove('hidden');
    controls.classList.remove('hidden');
    bottomGuide.classList.remove('hidden');
    setAnimal(currentAnimal);
    setMode('image');
  }catch(error){
    console.error(error);
    alert('카메라를 열 수 없어요. Chrome 카메라 권한을 확인해 주세요.');
  }
}

// 중요: 카메라는 이 버튼을 눌렀을 때만 시작됩니다. 자동 실행 코드 없음.
$('#start-button').addEventListener('click', startCamera);

$('#app').addEventListener('pointerdown', (event) => {
  if(!cameraStarted) return;
  if(event.target.closest('button')) return;
  placeAt(event.clientX, event.clientY);
});

document.querySelectorAll('.animal-btn').forEach(btn => btn.addEventListener('click', () => setAnimal(btn.dataset.animal)));
document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
$('#center-button').addEventListener('click', centerAnimal);
$('#hide-animal').addEventListener('click', () => {
  stage.classList.add('hidden');
  animalVideo.pause();
  setMessage('동물을 숨겼어요. 작품 위를 다시 터치하면 나타나요.');
});
$('#bigger').addEventListener('click', () => { scale = Math.min(scale + 0.15, 2.3); stage.style.width = `${42 * scale}vw`; });
$('#smaller').addEventListener('click', () => { scale = Math.max(scale - 0.15, 0.5); stage.style.width = `${42 * scale}vw`; });
$('#fit-toggle').addEventListener('click', () => {
  camera.classList.toggle('cover');
  $('#fit-toggle').textContent = camera.classList.contains('cover') ? '전체보기' : '꽉채우기';
  setMessage(camera.classList.contains('cover') ? '화면을 꽉 채워요. 가장자리는 조금 잘릴 수 있어요.' : '카메라 전체가 보이도록 했어요. 검은 여백이 생길 수 있어요.');
});

Object.values(animals).forEach(animal => { const img = new Image(); img.src = animal.image; });
