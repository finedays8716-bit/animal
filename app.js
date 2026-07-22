function syncViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
}
syncViewportHeight();
window.addEventListener('resize', syncViewportHeight);
window.addEventListener('orientationchange', () => setTimeout(syncViewportHeight, 160));
window.visualViewport?.addEventListener('resize', syncViewportHeight);

const animals = {
  bear: {
    badge: '숲 친구',
    name: '반달가슴곰',
    message: '“조용하고 깨끗한 숲이 나의 집이에요. 나무와 숲길을 잘 지켜 주세요.”',
    question: '반달가슴곰이 살기 좋은 숲을 만들려면 무엇이 필요할까요?',
    speech: '나는 반달가슴곰이야. 조용하고 깨끗한 숲이 좋아.'
  },
  otter: {
    badge: '물가 친구',
    name: '수달',
    message: '“맑은 물과 안전한 물가가 필요해요. 쓰레기 없는 물길을 함께 지켜요.”',
    question: '수달이 살 물을 깨끗하게 하려면 우리는 무엇을 할 수 있을까요?',
    speech: '나는 수달이야. 맑은 물이 필요해.'
  },
  goral: {
    badge: '산 친구',
    name: '산양',
    message: '“바위가 있는 산을 좋아해요. 안전하고 조용한 산이 필요해요.”',
    question: '산양이 다치지 않고 다니려면 산에는 어떤 것이 적으면 좋을까요?',
    speech: '나는 산양이야. 안전하고 조용한 산이 필요해.'
  },
  spoonbill: {
    badge: '물가 친구',
    name: '저어새',
    message: '“깨끗한 물가와 갯벌이 필요해요. 쉬어 갈 수 있는 습지를 지켜 주세요.”',
    question: '저어새가 쉬어 갈 수 있는 물가를 만들려면 무엇을 지켜야 할까요?',
    speech: '나는 저어새야. 깨끗한 물가를 함께 지켜 줘.'
  }
};

const $ = (selector) => document.querySelector(selector);
const startScreen = $('#start-screen');
const startButton = $('#start-button');
const statusPill = $('#status-pill');
const scanGuide = $('#scan-guide');
const helpPanel = $('#help-panel');
const animalCard = $('#animal-card');

function setStatus(text, guideHidden = false) {
  statusPill.textContent = text;
  scanGuide.classList.toggle('hidden', guideHidden);
}

function showAnimal(key) {
  const animal = animals[key];
  if (!animal) return;
  $('#animal-badge').textContent = animal.badge;
  $('#animal-name').textContent = animal.name;
  $('#animal-message').textContent = animal.message;
  $('#animal-question').textContent = animal.question;
  animalCard.classList.remove('hidden');
  helpPanel.classList.add('hidden');
  setStatus(`${animal.name} 친구가 나타났어요. 작품을 함께 살펴볼까요?`, true);

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(animal.speech);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

startButton.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  setStatus('카메라를 허용하고 작품에 붙인 AR 표찰을 비춰 주세요.', false);
});

$('#help-button').addEventListener('click', () => {
  helpPanel.classList.toggle('hidden');
  animalCard.classList.add('hidden');
});

document.querySelectorAll('.panel-close').forEach((button) => {
  button.addEventListener('click', () => {
    helpPanel.classList.add('hidden');
    animalCard.classList.add('hidden');
  });
});

const markerMap = {
  'marker-bear': 'bear',
  'marker-otter': 'otter',
  'marker-goral': 'goral',
  'marker-spoonbill': 'spoonbill'
};

Object.keys(markerMap).forEach((id) => {
  const marker = document.getElementById(id);
  marker.addEventListener('markerFound', () => {
    showAnimal(markerMap[id]);
  });
  marker.addEventListener('markerLost', () => {
    animalCard.classList.add('hidden');
    setStatus('다른 작품의 AR 표찰도 비춰 보세요.', false);
  });
});

document.querySelectorAll('[data-animal]').forEach((entity) => {
  entity.addEventListener('click', () => showAnimal(entity.dataset.animal));
});

window.addEventListener('error', (event) => {
  if (String(event.message || '').toLowerCase().includes('camera')) {
    setStatus('카메라를 사용할 수 없어요. 브라우저 권한과 HTTPS 주소를 확인해 주세요.', false);
  }
});
