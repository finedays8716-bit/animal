const animals = {
  bear: {
    badge: '숲 친구',
    name: '반달가슴곰',
    message: '“나무와 풀, 조용한 숲이 나의 집이에요. 숲을 깨끗하게 지켜 주세요.”',
    question: '우리 숲에 반달가슴곰이 편히 지내려면 무엇이 필요할까요?',
    speech: '나는 반달가슴곰이야. 숲을 깨끗하게 지켜 줘.'
  },
  otter: {
    badge: '물가 친구',
    name: '수달',
    message: '“맑은 물과 물가가 필요해요. 쓰레기가 없는 물길을 함께 지켜요.”',
    question: '수달이 사는 물을 깨끗하게 하려면 우리는 무엇을 할 수 있을까요?',
    speech: '나는 수달이야. 맑은 물이 필요해.'
  },
  goral: {
    badge: '산 친구',
    name: '산양',
    message: '“바위가 있는 산을 천천히 걸어요. 조용하고 안전한 산이 필요해요.”',
    question: '산양이 다치지 않고 다니려면 산에는 어떤 것이 적으면 좋을까요?',
    speech: '나는 산양이야. 안전하고 조용한 산이 필요해.'
  },
  spoonbill: {
    badge: '물가 친구',
    name: '저어새',
    message: '“물가와 갯벌에서 쉬고 먹이를 찾아요. 깨끗한 물가를 함께 지켜요.”',
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
const marker = $('#forest-marker');

function setStatus(text, markerSeen = false) {
  statusPill.textContent = text;
  scanGuide.classList.toggle('hidden', markerSeen);
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
  setStatus(`${animal.name} 친구를 만났어요. 이야기를 들어 볼까요?`, true);

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
  setStatus('카메라를 허용하고 AR 생태 관찰 마커를 비춰 주세요.', false);
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

marker.addEventListener('markerFound', () => {
  setStatus('동물 친구들이 숲에 나타났어요. 동물을 톡 눌러 보세요!', true);
});

marker.addEventListener('markerLost', () => {
  setStatus('마커가 잘 보이도록 태블릿을 조금 멀리해 보세요.', false);
  animalCard.classList.add('hidden');
});

document.querySelectorAll('[data-animal]').forEach((entity) => {
  entity.addEventListener('click', () => showAnimal(entity.dataset.animal));
});

window.addEventListener('error', (event) => {
  if (String(event.message || '').toLowerCase().includes('camera')) {
    setStatus('카메라를 사용할 수 없어요. 브라우저 권한과 HTTPS 주소를 확인해 주세요.', false);
  }
});
