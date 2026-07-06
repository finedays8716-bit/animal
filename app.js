import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.165.0/examples/jsm/webxr/ARButton.js';

function syncViewportHeight() {
  const h = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
}
syncViewportHeight();
window.addEventListener('resize', syncViewportHeight);
window.addEventListener('orientationchange', () => setTimeout(syncViewportHeight, 160));
window.visualViewport?.addEventListener('resize', syncViewportHeight);

const animalData = {
  bear: {
    key: 'bear',
    name: '반달가슴곰',
    badge: '숲 친구',
    statusReady: '발자국 표시를 숲 위 원하는 자리에 맞추고 “여기에 놓기”를 눌러 주세요.',
    message: '숲이 깨끗하고 조용해야 반달가슴곰이 편하게 지낼 수 있어요.',
    question: '반달가슴곰이 좋아할 숲을 만들려면 무엇을 지켜야 할까요?',
    speech: '나는 반달가슴곰이야. 깨끗하고 조용한 숲이 좋아.',
    texture: 'assets/animals/bear.png',
    shadow: 0.42,
    height: 0.85,
    bob: 0.018,
    sway: 0.03
  },
  otter: {
    key: 'otter',
    name: '수달',
    badge: '물가 친구',
    statusReady: '물길이나 돌 근처처럼 보이는 곳에 수달을 놓아 보세요.',
    message: '수달은 맑은 물과 깨끗한 물가가 있어야 잘 살 수 있어요.',
    question: '수달이 사는 물을 깨끗하게 하려면 우리는 무엇을 할 수 있을까요?',
    speech: '나는 수달이야. 맑은 물이 정말 중요해.',
    texture: 'assets/animals/otter.png',
    shadow: 0.34,
    height: 0.72,
    bob: 0.024,
    sway: 0.05
  },
  goral: {
    key: 'goral',
    name: '산양',
    badge: '산 친구',
    statusReady: '돌이나 언덕처럼 보이는 자리에 산양을 놓아 보세요.',
    message: '산양은 바위가 있는 조용한 산에서 안전하게 지내요.',
    question: '산양이 다치지 않고 지내려면 산에는 어떤 것이 적으면 좋을까요?',
    speech: '나는 산양이야. 조용하고 안전한 산이 필요해.',
    texture: 'assets/animals/goral.png',
    shadow: 0.36,
    height: 0.88,
    bob: 0.016,
    sway: 0.028
  },
  spoonbill: {
    key: 'spoonbill',
    name: '저어새',
    badge: '물가 친구',
    statusReady: '물가처럼 보이는 자리에 저어새를 놓아 보세요.',
    message: '저어새는 깨끗한 물가와 먹이를 찾을 수 있는 습지가 필요해요.',
    question: '저어새가 쉬어 갈 수 있는 물가를 만들려면 무엇을 지켜야 할까요?',
    speech: '나는 저어새야. 깨끗한 물가를 지켜 줘.',
    texture: 'assets/animals/spoonbill.png',
    shadow: 0.24,
    height: 0.98,
    bob: 0.022,
    sway: 0.024
  }
};

const $ = (s) => document.querySelector(s);
const splash = $('#splash-screen');
const supportNote = $('#support-note');
const enterARButton = $('#enter-ar-button');
const hud = $('#hud');
const infoPanel = $('#info-panel');
const selectorSheet = $('#selector-sheet');
const bottomBar = $('#bottom-bar');
const placeButton = $('#place-button');
const replaceButton = $('#replace-button');
const changeAnimalButton = $('#change-animal');
const tapTarget = $('#tap-target');
const selectedName = $('#selected-name');
const statusText = $('#status-text');
const infoBadge = $('#info-badge');
const infoName = $('#info-name');
const infoMessage = $('#info-message');
const infoQuestion = $('#info-question');

let currentAnimalKey = 'bear';
let arSupported = false;
let reticleVisible = false;
let currentHitMatrix = null;
let placedEntity = null;
let textures = {};
let arButton;
let hitTestSource = null;
let localReferenceSpace = null;
let viewerSpace = null;
let hitTestSourceRequested = false;
let xrSession = null;
let anchorSpace = null;
let anchorObject = null;

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('renderer-shell').appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbccbb, 1.2);
scene.add(hemiLight);

const reticle = createReticle();
reticle.visible = false;
scene.add(reticle);

const controller = renderer.xr.getController(0);
controller.addEventListener('select', () => {
  if (xrSession && reticleVisible) {
    placeCurrentAnimal();
  }
});
scene.add(controller);

const textureLoader = new THREE.TextureLoader();
await preloadTextures();
renderSheetGrid();
setCurrentAnimal(currentAnimalKey);
initARButton();
checkSupport();

window.addEventListener('resize', onWindowResize);
enterARButton.addEventListener('click', () => {
  if (!arSupported) {
    supportNote.textContent = '이 기기에서는 WebXR 공간 AR을 지원하지 않아요. 안드로이드 Chrome 계열 기기에서 실행해 주세요.';
    return;
  }
  arButton.click();
});
placeButton.addEventListener('click', () => placeCurrentAnimal());
replaceButton.addEventListener('click', () => {
  removePlacedEntity();
  setStatus(animalData[currentAnimalKey].statusReady);
  infoPanel.classList.add('hidden');
});
changeAnimalButton.addEventListener('click', () => selectorSheet.classList.toggle('hidden'));
$('#close-sheet').addEventListener('click', () => selectorSheet.classList.add('hidden'));
$('#close-info').addEventListener('click', () => infoPanel.classList.add('hidden'));
tapTarget.addEventListener('click', () => {
  if (reticleVisible) {
    placeCurrentAnimal();
  }
});

document.querySelectorAll('#animal-grid .animal-tile').forEach((button) => {
  button.addEventListener('click', () => {
    setCurrentAnimal(button.dataset.animal);
    syncTileSelection(button.dataset.animal, '#animal-grid');
  });
});

renderer.xr.addEventListener('sessionstart', async () => {
  xrSession = renderer.xr.getSession();
  splash.classList.add('hidden');
  hud.classList.remove('hidden');
  bottomBar.classList.remove('hidden');
  tapTarget.classList.remove('hidden');
  selectorSheet.classList.add('hidden');
  infoPanel.classList.add('hidden');
  setStatus('숲의 바닥이나 작품 받침대를 천천히 비춰 주세요.');

  hitTestSourceRequested = false;
  hitTestSource = null;
  localReferenceSpace = null;
  viewerSpace = null;
  anchorSpace = null;
  anchorObject = null;

  xrSession.addEventListener('end', onSessionEnd);
});

renderer.setAnimationLoop(render);

async function preloadTextures() {
  const entries = Object.values(animalData).map((animal) => new Promise((resolve) => {
    textureLoader.load(animal.texture, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      textures[animal.key] = texture;
      resolve();
    });
  }));
  await Promise.all(entries);
}

function renderSheetGrid() {
  const sheetGrid = $('#sheet-grid');
  sheetGrid.innerHTML = '';
  Object.values(animalData).forEach((animal) => {
    const button = document.createElement('button');
    button.className = `animal-tile${animal.key === currentAnimalKey ? ' selected' : ''}`;
    button.dataset.animal = animal.key;
    button.type = 'button';
    button.innerHTML = `<img src="assets/animals/${animal.key}-thumb.png" alt="${animal.name}"><span>${animal.name}</span>`;
    button.addEventListener('click', () => {
      setCurrentAnimal(animal.key);
      syncTileSelection(animal.key, '#sheet-grid');
      syncTileSelection(animal.key, '#animal-grid');
      selectorSheet.classList.add('hidden');
      if (xrSession && placedEntity) {
        removePlacedEntity();
        setStatus(animal.statusReady);
      }
    });
    sheetGrid.appendChild(button);
  });
}

function syncTileSelection(key, scopeSelector) {
  document.querySelectorAll(`${scopeSelector} .animal-tile`).forEach((tile) => {
    tile.classList.toggle('selected', tile.dataset.animal === key);
  });
}

function setCurrentAnimal(key) {
  currentAnimalKey = key;
  const animal = animalData[key];
  selectedName.textContent = animal.name;
  infoBadge.textContent = animal.badge;
  infoName.textContent = animal.name;
  infoMessage.textContent = animal.message;
  infoQuestion.textContent = animal.question;
  if (!xrSession) {
    supportNote.textContent = `${animal.name}을(를) 골랐어요. AR을 시작하면 한 마리만 숲에 놓을 수 있어요.`;
  }
  if (xrSession && !placedEntity) {
    setStatus(animal.statusReady);
  }
}

function setStatus(text) {
  statusText.textContent = text;
}

function initARButton() {
  arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'anchors'],
    domOverlay: { root: document.body }
  });
  arButton.style.display = 'none';
  document.body.appendChild(arButton);
}

async function checkSupport() {
  if (!navigator.xr || !window.isSecureContext) {
    supportNote.textContent = '이 기능은 HTTPS 주소의 WebXR 공간 AR이 필요해요. GitHub Pages 주소로 열고, 안드로이드 Chrome 계열 기기에서 실행해 주세요.';
    enterARButton.disabled = false;
    return;
  }
  try {
    arSupported = await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    arSupported = false;
  }
  supportNote.textContent = arSupported
    ? '이 기기에서는 공간 AR을 사용할 수 있어요. 동물을 고른 뒤 AR을 시작해 주세요.'
    : '이 기기/브라우저에서는 공간 AR이 지원되지 않을 수 있어요. 안드로이드 Chrome 계열 기기에서 가장 안정적으로 실행됩니다.';
}

function createReticle() {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.09, 0.12, 48),
    new THREE.MeshBasicMaterial({ color: 0x38c172, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff7d6, side: THREE.DoubleSide })
  );
  dot.rotation.x = -Math.PI / 2;
  dot.position.y = 0.001;
  group.add(dot);

  const foot = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  foot.position.set(0, 0.0015, -0.18);
  foot.rotation.x = -Math.PI / 2;
  group.add(foot);

  return group;
}

function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 16, 128, 128, 110);
  gradient.addColorStop(0, 'rgba(0,0,0,0.38)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.18)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
const shadowTexture = createShadowTexture();

function createAnimalGroup(animal) {
  const group = new THREE.Group();
  const texture = textures[animal.key];
  const image = texture.image;
  const aspect = (image.width || 1) / (image.height || 1);
  const height = animal.height;
  const width = height * aspect;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(animal.shadow * 2.2, animal.shadow * 1.3),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.001;
  group.add(shadow);

  const animalMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })
  );
  animalMesh.position.y = height / 2;
  animalMesh.userData.baseY = height / 2;
  animalMesh.userData.height = height;
  group.add(animalMesh);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.05, 28),
    new THREE.MeshBasicMaterial({ color: 0xf7d54a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.002;
  group.add(marker);

  group.userData.animal = animal;
  group.userData.animalMesh = animalMesh;
  group.userData.shadow = shadow;
  return group;
}

function placeCurrentAnimal() {
  if (!reticleVisible || !currentHitMatrix) return;
  removePlacedEntity();
  const animal = animalData[currentAnimalKey];
  placedEntity = createAnimalGroup(animal);
  placedEntity.matrixAutoUpdate = true;
  scene.add(placedEntity);

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  currentHitMatrix.decompose(position, quaternion, scale);
  placedEntity.position.copy(position);
  const yEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  placedEntity.rotation.set(0, yEuler.y, 0);

  infoPanel.classList.remove('hidden');
  selectorSheet.classList.add('hidden');
  setStatus(`${animal.name}을(를) 숲에 초대했어요. 동물 바꾸기나 다시 놓기도 할 수 있어요.`);
  speak(animal.speech);
}

function removePlacedEntity() {
  if (!placedEntity) return;
  scene.remove(placedEntity);
  placedEntity.traverse((child) => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
      else child.material.dispose?.();
    }
  });
  placedEntity = null;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function onSessionEnd() {
  xrSession = null;
  hitTestSourceRequested = false;
  hitTestSource = null;
  localReferenceSpace = null;
  viewerSpace = null;
  anchorSpace = null;
  anchorObject = null;
  reticle.visible = false;
  reticleVisible = false;
  currentHitMatrix = null;
  removePlacedEntity();
  window.speechSynthesis?.cancel();

  splash.classList.remove('hidden');
  hud.classList.add('hidden');
  bottomBar.classList.add('hidden');
  tapTarget.classList.add('hidden');
  selectorSheet.classList.add('hidden');
  infoPanel.classList.add('hidden');
  setCurrentAnimal(currentAnimalKey);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
  if (frame && xrSession) {
    if (!hitTestSourceRequested) {
      xrSession.requestReferenceSpace('viewer').then((space) => { viewerSpace = space; return xrSession.requestHitTestSource({ space }); }).then((source) => {
        hitTestSource = source;
      }).catch(() => {
        setStatus('이 기기에서는 표면 찾기가 잘 되지 않을 수 있어요. 천천히 움직여 주세요.');
      });

      xrSession.requestReferenceSpace('local').then((space) => {
        localReferenceSpace = space;
      });

      xrSession.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource?.cancel?.();
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource && localReferenceSpace) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(localReferenceSpace);
        if (pose) {
          currentHitMatrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
          currentHitMatrix.decompose(reticle.position, reticle.quaternion, reticle.scale);
          reticle.visible = true;
          reticleVisible = true;
          if (!placedEntity) {
            setStatus(animalData[currentAnimalKey].statusReady);
          }
        }
      } else {
        reticle.visible = false;
        reticleVisible = false;
        if (!placedEntity) {
          setStatus('숲의 바닥이나 작품 받침대를 천천히 비춰 주세요. 발자국 표시가 나타나면 놓을 수 있어요.');
        }
      }
    }
  }

  const elapsed = clock.getElapsedTime();
  if (placedEntity) {
    const animal = placedEntity.userData.animal;
    const mesh = placedEntity.userData.animalMesh;
    mesh.position.y = mesh.userData.baseY + Math.sin(elapsed * 2.1) * animal.bob;
    mesh.rotation.z = Math.sin(elapsed * 1.4) * animal.sway;
    mesh.rotation.y = Math.sin(elapsed * 0.9) * animal.sway * 0.75;
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    mesh.lookAt(camPos.x, placedEntity.position.y + mesh.userData.baseY * 0.92, camPos.z);
    mesh.rotation.z += Math.sin(elapsed * 1.4) * animal.sway;
  }

  renderer.render(scene, camera);
}
