import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

import colors from './data/colors.json';
import faces from './data/faces.json';
import vertices from './data/vertices.json';

const ambentLight = new THREE.AmbientLight(0xffffff, 0.8);
const cameraLight = new THREE.DirectionalLight(0xffffff, 0.25);
// cameraLight.position = new THREE.Vector3(0, 0, 0);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.up = new THREE.Vector3(0, 0, 1);
camera.children = [cameraLight];

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('black');
scene.children = [ambentLight, camera];

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

camera.position.z = 5;

function plotMeshes() {
    let pmax = 0;
    let pmin = 65536;
    vertices.forEach((row) => {
        const rowMax = Math.max(...row);
        if(rowMax > pmax) {
            pmax = rowMax;
        }
        const rowMin = Math.min(...row);
        if(rowMin < pmin) {
            pmin = rowMin;
        }
    });
    // TODO pmax, pmin should be [-805.5837  -688.60065    0.     ] [669.88275 517.0351   98.57   ]
    const n_v = vertices.length;
    console.log(pmax, pmin, n_v);

    const facesFlattened = faces.flat();
    let geo = new THREE.BufferGeometry();
    geo.setIndex(facesFlattened);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors.flat(), 3));

    let material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1.0,  // 0.5,
        metalness: 0.0,  // 0.5,
        side: THREE.DoubleSide,
        flatShading: true,
    });

    let mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);
}

plotMeshes();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
