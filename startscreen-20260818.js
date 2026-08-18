function syncViewportHeight(){
  const h = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
}
syncViewportHeight();
window.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('resize', syncViewportHeight);
window.addEventListener('orientationchange', () => setTimeout(syncViewportHeight, 250));

const animals = {
  bear: {
    name:'반달가슴곰',
    image:'assets/animals/bear.png',
    videos:[
      'assets/videos/bear_old.webm?v=20260818-randommix',
      'assets/videos/bear_new.webm?v=20260818-randommix'
    ],
    size:46,
    message:'반달가슴곰이 살 숲 위를 터치해 보세요.'
  },
  deer: {
    name:'노루',
    image:'assets/animals/deer.png',
    videos:[
      'assets/videos/deer_old.webm?v=20260818-randommix',
      'assets/videos/deer_new.webm?v=20260818-randommix'
    ],
    size:34,
    message:'노루가 쉴 풀밭이나 숲 위를 터치해 보세요.'
  },
  otter: {
    name:'수달',
    image:'assets/animals/otter.png',
    videos:[
      'assets/videos/otter_old.webm?v=20260818-randommix',
      'assets/videos/otter_new.webm?v=20260818-randommix'
    ],
    size:36,
    message:'수달이 살 물가나 강 위를 터치해 보세요.'
  }
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
let currentVideoSrc = '';
let mediaRecorder = null;
let recordedChunks = [];
let recordCanvas = null;
let recordContext = null;
let recordAnimationId = null;
let isRecording = false;

function setMessage(text){ message.textContent = text; }

function applyDefaultSize(){
  const base = animals[currentAnimal]?.size || 42;
  stage.style.width = `${base * scale}vw`;
}

function pickRandomVideo(key){
  const list = animals[key]?.videos || [];
  if(!list.length) return '';
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function setAnimal(key){
  currentAnimal = key;
  const data = animals[key];
  currentVideoSrc = '';
  applyDefaultSize();
  animalImage.src = data.image;
  animalImage.alt = data.name;
  animalVideo.pause();
  animalVideo.removeAttribute('src');
  animalVideo.load();
  stage.classList.toggle('video-mode', currentMode === 'video');
  if(currentMode === 'video') prepareVideo(true);
  setMessage(`${data.name} 선택됨. ${data.message}`);
  document.querySelectorAll('.animal-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.animal === key));
}

function setMode(mode){
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.mode === mode));
  if(mode === 'video'){
    prepareVideo(true);
    stage.classList.add('video-mode');
    setMessage('영상 모드입니다. 보금자리 위치를 터치하면 동물이 나타나요.');
  } else {
    animalVideo.pause();
    stage.classList.remove('video-mode');
    setMessage(`${animals[currentAnimal].name} 사진 모드입니다. 작품 위를 터치하세요.`);
  }
}

function prepareVideo(forceRandom = false){
  if(forceRandom || !currentVideoSrc){
    currentVideoSrc = pickRandomVideo(currentAnimal);
  }
  if(animalVideo.getAttribute('src') !== currentVideoSrc){
    animalVideo.src = currentVideoSrc;
    animalVideo.muted = true;
    animalVideo.loop = true;
    animalVideo.playsInline = true;
    animalVideo.setAttribute('playsinline', '');
    animalVideo.setAttribute('webkit-playsinline', '');
    animalVideo.load();
  }
  animalVideo.play().catch(() => setMessage('영상 재생이 어려우면 사진 모드를 사용하세요.'));
}

function placeAt(clientX, clientY){
  if(!cameraStarted) return;
  const controlRect = controls.getBoundingClientRect();
  const bottomRect = bottomGuide.getBoundingClientRect();
  if(clientY < controlRect.bottom + 6 || clientY > bottomRect.top - 6) return;
  stage.style.left = `${clientX}px`;
  stage.style.top = `${clientY}px`;
  stage.classList.remove('hidden');
  if(currentMode === 'video') prepareVideo(true);
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

function drawVideoElementToCanvas(ctx, video, targetW, targetH){
  if(!video.videoWidth || !video.videoHeight) return;
  const objectFit = camera.classList.contains('cover') ? 'cover' : 'contain';
  const sourceRatio = video.videoWidth / video.videoHeight;
  const targetRatio = targetW / targetH;

  let drawW, drawH, dx, dy;
  if(objectFit === 'cover'){
    if(sourceRatio > targetRatio){
      drawH = targetH;
      drawW = targetH * sourceRatio;
      dx = (targetW - drawW) / 2;
      dy = 0;
    }else{
      drawW = targetW;
      drawH = targetW / sourceRatio;
      dx = 0;
      dy = (targetH - drawH) / 2;
    }
  }else{
    if(sourceRatio > targetRatio){
      drawW = targetW;
      drawH = targetW / sourceRatio;
      dx = 0;
      dy = (targetH - drawH) / 2;
    }else{
      drawH = targetH;
      drawW = targetH * sourceRatio;
      dx = (targetW - drawW) / 2;
      dy = 0;
    }
  }
  ctx.drawImage(video, dx, dy, drawW, drawH);
}

function drawStageToCanvas(ctx, canvasW, canvasH){
  if(stage.classList.contains('hidden')) return;
  const rect = stage.getBoundingClientRect();
  const scaleX = canvasW / window.innerWidth;
  const scaleY = canvasH / window.innerHeight;
  const x = rect.left * scaleX;
  const y = rect.top * scaleY;
  const w = rect.width * scaleX;
  const h = rect.height * scaleY;

  const source = currentMode === 'video' ? animalVideo : animalImage;
  try{
    if(currentMode === 'video'){
      if(animalVideo.readyState >= 2){
        ctx.drawImage(animalVideo, x, y, w, h);
      }
    }else if(animalImage.complete){
      ctx.drawImage(animalImage, x, y, w, h);
    }
  }catch(e){
    console.warn('animal draw failed', e);
  }
}

function composeFrame(canvas){
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawVideoElementToCanvas(ctx, camera, canvas.width, canvas.height);
  drawStageToCanvas(ctx, canvas.width, canvas.height);
  return ctx;
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeTimestamp(){
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function capturePhoto(){
  if(!cameraStarted){
    setMessage('먼저 카메라를 시작해 주세요.');
    return;
  }
  const canvas = document.createElement('canvas');
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  composeFrame(canvas);
  canvas.toBlob((blob) => {
    if(blob){
      downloadBlob(blob, `보금자리_관찰_${animals[currentAnimal].name}_${makeTimestamp()}.png`);
      setMessage('사진을 저장했어요.');
    }
  }, 'image/png');
}

function drawRecordingLoop(){
  if(!isRecording || !recordCanvas) return;
  composeFrame(recordCanvas);
  recordAnimationId = requestAnimationFrame(drawRecordingLoop);
}

function startRecording(){
  if(!cameraStarted){
    setMessage('먼저 카메라를 시작해 주세요.');
    return;
  }
  if(isRecording) return;
  if(!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder){
    setMessage('이 브라우저에서는 동영상 녹화를 지원하지 않아요. 사진 저장을 사용해 주세요.');
    return;
  }
  recordCanvas = document.createElement('canvas');
  recordCanvas.width = Math.round(window.innerWidth);
  recordCanvas.height = Math.round(window.innerHeight);
  composeFrame(recordCanvas);
  const canvasStream = recordCanvas.captureStream(24);
  recordedChunks = [];

  let mimeType = 'video/webm;codecs=vp9';
  if(!MediaRecorder.isTypeSupported(mimeType)){
    mimeType = 'video/webm';
  }

  try{
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType });
  }catch(e){
    console.error(e);
    setMessage('동영상 녹화를 시작할 수 없어요. 사진 저장을 사용해 주세요.');
    return;
  }

  mediaRecorder.ondataavailable = (event) => {
    if(event.data && event.data.size > 0) recordedChunks.push(event.data);
  };
  mediaRecorder.onstop = () => {
    cancelAnimationFrame(recordAnimationId);
    isRecording = false;
    $('#record-video').textContent = '녹화 시작';
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    downloadBlob(blob, `보금자리_관찰_${animals[currentAnimal].name}_${makeTimestamp()}.webm`);
    setMessage('동영상을 저장했어요.');
  };

  isRecording = true;
  $('#record-video').textContent = '녹화 종료';
  mediaRecorder.start();
  drawRecordingLoop();
  setMessage('녹화 중이에요. 다시 누르면 저장됩니다.');
}

function toggleRecording(){
  if(isRecording && mediaRecorder){
    mediaRecorder.stop();
  }else{
    startRecording();
  }
}

$('#start-button').addEventListener('click', startCamera);
$('#app').addEventListener('pointerdown', (event) => {
  if(!cameraStarted) return;
  if(event.target.closest('button')) return;
  placeAt(event.clientX, event.clientY);
});
document.querySelectorAll('.animal-btn').forEach(btn => btn.addEventListener('click', () => setAnimal(btn.dataset.animal)));
document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
$('#center-button').addEventListener('click', () => centerAnimal());
$('#hide-animal').addEventListener('click', () => {
  stage.classList.add('hidden');
  animalVideo.pause();
  setMessage('동물을 숨겼어요. 작품 위를 다시 터치하면 나타나요.');
});
$('#bigger').addEventListener('click', () => { scale = Math.min(scale + 0.15, 2.3); applyDefaultSize(); });
$('#smaller').addEventListener('click', () => { scale = Math.max(scale - 0.15, 0.5); applyDefaultSize(); });
$('#capture-photo').addEventListener('click', capturePhoto);
$('#record-video').addEventListener('click', toggleRecording);
$('#fit-toggle').addEventListener('click', () => {
  camera.classList.toggle('cover');
  $('#fit-toggle').textContent = camera.classList.contains('cover') ? '전체보기' : '꽉채우기';
  setMessage(camera.classList.contains('cover') ? '화면을 꽉 채워요. 가장자리는 조금 잘릴 수 있어요.' : '카메라 전체가 보이도록 했어요. 검은 여백이 생길 수 있어요.');
});
Object.values(animals).forEach(animal => { const img = new Image(); img.src = animal.image; });
