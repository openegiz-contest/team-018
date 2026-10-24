import * as THREE from 'three';
import type { CadMaterialLibrary } from './materials';

interface SignSpec {
  position: [number, number, number];
  rotationY: number;
  plateWidth: number;
  plateHeight: number;
  postHeight: number;
  plateColor: 'white' | 'yellow';
  borderColor: 'red' | 'black';
  hazardStripes: boolean;
  label: string;
}

function makeCanvasTexture(
  label: string,
  plateColor: 'white' | 'yellow',
  borderColor: 'red' | 'black',
  hazardStripes: boolean
): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const bg = plateColor === 'white' ? '#f4f4f0' : '#f2c200';
  const border = borderColor === 'red' ? '#c1121f' : '#111111';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Border
  const bw = 28;
  ctx.strokeStyle = border;
  ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);

  // Hazard stripes (diagonal black/yellow) along bottom band
  if (hazardStripes) {
    const bandH = 90;
    const y0 = h - bandH - bw;
    ctx.save();
    ctx.beginPath();
    ctx.rect(bw, y0, w - bw * 2, bandH);
    ctx.clip();
    ctx.fillStyle = '#f2c200';
    ctx.fillRect(bw, y0, w - bw * 2, bandH);
    ctx.fillStyle = '#111111';
    const stripe = 40;
    for (let x = -h; x < w + h; x += stripe * 2) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + stripe, y0);
      ctx.lineTo(x + stripe - bandH, y0 + bandH);
      ctx.lineTo(x - bandH, y0 + bandH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Text
  ctx.fillStyle = borderColor === 'red' ? '#111111' : '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = label.split('\n');
  const fontSize = lines.length > 1 ? 74 : 96;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  const centerY = hazardStripes ? (h - 90) / 2 : h / 2;
  const lineHeight = fontSize * 1.15;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, startY + i * lineHeight);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createQuarrySafetySignage(
  mats: CadMaterialLibrary,
  getGroundY?: (x: number, z: number) => number
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'QUARRY_ROAD_SIGNAGE';

  const steelMat = mats.wheelHubSteel;

  const specs: SignSpec[] = [
    {
      // Вынос с полосы движения: X=40, Z=20.5 (контрольный грунт: -3.18 м, distXZ >= 6.7 м)
      position: [40.0, -3.18, 20.5],
      rotationY: -Math.PI / 6,
      plateWidth: 1.6,
      plateHeight: 1.6,
      postHeight: 2.6,
      plateColor: 'yellow',
      borderColor: 'black',
      hazardStripes: false,
      label: 'Крутой\nспуск 10%',
    },
    {
      // Вынос с полосы движения: X=22.5, Z=-26.5 (контрольный грунт: 5.62 м, distXZ >= 6.7 м)
      position: [22.5, 5.62, -26.5],
      rotationY: Math.PI / 6,
      plateWidth: 1.4,
      plateHeight: 1.4,
      postHeight: 2.4,
      plateColor: 'white',
      borderColor: 'red',
      hazardStripes: false,
      label: '25',
    },
    {
      // Вынос с полосы движения: X=-16.0, Z=-27.0 (контрольный грунт: 4.47 м, distXZ >= 6.6 м)
      position: [-16.0, 4.47, -27.0],
      rotationY: Math.PI / 2,
      plateWidth: 1.8,
      plateHeight: 1.2,
      postHeight: 2.4,
      plateColor: 'white',
      borderColor: 'red',
      hazardStripes: false,
      label: 'Дистанция\n50м',
    },
    {
      // Вынос с полосы движения: X=29.5, Z=12.0 (контрольный грунт: -2.86 м, distXZ >= 6.6 м)
      position: [29.5, -2.86, 12.0],
      rotationY: -Math.PI / 4,
      plateWidth: 1.8,
      plateHeight: 1.4,
      postHeight: 2.8,
      plateColor: 'yellow',
      borderColor: 'black',
      hazardStripes: true,
      label: 'Троллей\n1200В',
    },
    {
      // Вынос с полосы движения: X=-30.5, Z=12.0 (контрольный грунт: -14.54 м, distXZ >= 6.8 м)
      position: [-30.5, -14.54, 12.0],
      rotationY: Math.PI / 2,
      plateWidth: 2.0,
      plateHeight: 1.6,
      postHeight: 2.8,
      plateColor: 'yellow',
      borderColor: 'black',
      hazardStripes: true,
      label: 'Опасно:\nЗабой БВР',
    },
    {
      // Вынос с полосы движения: X=30.0, Z=-40.0 (контрольный грунт: 5.72 м, distXZ >= 8.2 м)
      position: [30.0, 5.72, -40.0],
      rotationY: -Math.PI / 6,
      plateWidth: 1.8,
      plateHeight: 1.4,
      postHeight: 2.4,
      plateColor: 'white',
      borderColor: 'red',
      hazardStripes: false,
      label: 'Дробилка\n5 км/ч',
    },
  ];

  for (const spec of specs) {
    const signGroup = new THREE.Group();
    // Посадка стойки точно на рельеф (основание стойки y = 0)
    const gy = getGroundY
      ? getGroundY(spec.position[0], spec.position[2])
      : spec.position[1];
    signGroup.position.set(spec.position[0], gy, spec.position[2]);
    signGroup.rotation.y = spec.rotationY;
    signGroup.name = `SIGN_${spec.label.replace(/\s+/g, '_')}`;

    // Steel post
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, spec.postHeight, 12);
    const post = new THREE.Mesh(postGeo, steelMat);
    post.position.y = spec.postHeight / 2;
    post.castShadow = true;
    post.receiveShadow = true;
    signGroup.add(post);

    // Post base plate
    const baseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.08, 12);
    const base = new THREE.Mesh(baseGeo, steelMat);
    base.position.y = 0.04;
    base.castShadow = true;
    signGroup.add(base);

    // Sign plate frame (border) — slightly larger box behind the face
    const frameGeo = new THREE.BoxGeometry(
      spec.plateWidth + 0.08,
      spec.plateHeight + 0.08,
      0.06
    );
    const frameMat =
      spec.borderColor === 'red'
        ? mats.brakeLightActiveMat
        : mats.belazChassisDark;
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, spec.postHeight - spec.plateHeight / 2 - 0.1, 0);
    frame.castShadow = true;
    signGroup.add(frame);

    // Sign plate face with canvas texture
    const faceTex = makeCanvasTexture(
      spec.label,
      spec.plateColor,
      spec.borderColor,
      spec.hazardStripes
    );
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(0x111111),
      emissiveIntensity: 0.15,
    });
    const faceGeo = new THREE.BoxGeometry(spec.plateWidth, spec.plateHeight, 0.04);
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, spec.postHeight - spec.plateHeight / 2 - 0.1, 0.04);
    face.castShadow = true;
    signGroup.add(face);

    // Back plate (steel)
    const backGeo = new THREE.BoxGeometry(spec.plateWidth, spec.plateHeight, 0.02);
    const back = new THREE.Mesh(backGeo, steelMat);
    back.position.set(0, spec.postHeight - spec.plateHeight / 2 - 0.1, -0.02);
    signGroup.add(back);

    // Mounting brackets
    const bracketGeo = new THREE.BoxGeometry(0.12, 0.12, 0.14);
    for (const yOff of [-spec.plateHeight / 3, spec.plateHeight / 3]) {
      const bracket = new THREE.Mesh(bracketGeo, steelMat);
      bracket.position.set(
        0,
        spec.postHeight - spec.plateHeight / 2 - 0.1 + yOff,
        -0.06
      );
      signGroup.add(bracket);
    }

    group.add(signGroup);
  }

  return group;
}
