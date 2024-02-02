import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import {BufferGeometry} from "three";

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
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
scene.children = [ambientLight, camera];

const controls = new OrbitControls(camera, renderer.domElement);

let sessionID = '';

function setupCamera(camera, controls, mesh) {
    let box = new THREE.Box3().setFromObject(mesh);
    let center = box.getCenter(new THREE.Vector3());
    let corner = new THREE.Vector3(box.min.x, center.y, 1.5 * box.max.z);
    camera.position.copy(corner);
    camera.lookAt(center);
    controls.target = new THREE.Vector3(0, 0, 0);
    controls.update();
    zoomCameraToSelection(camera, controls, box, 0.3);
}

function zoomCameraToSelection(camera, controls, box, fitOffset = 1.2) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

    const direction = controls.target.clone()
      .sub(camera.position)
      .normalize()
      .multiplyScalar(distance);

    controls.maxDistance = distance * 10;
    controls.target.copy(center);

    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    camera.position.copy(controls.target).sub(direction);

    controls.update();

}

function createNewSession() {
    let requestBody = {
        "scene_id": 1
    }
    fetch('http://localhost:8001/session/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })
      .then(response => {
          if(!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(fetchResult => {
          sessionID = fetchResult.id;
          fetchAndPlotMeshes();
      });
}

function startSessionSimulation() {
    fetch('http://localhost:8001/session/' + sessionID + '/start/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
      .then(response => {
          if(!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(fetchResult => {
          console.log(fetchResult);
          let path = fetchResult.path;
          let segments = path.segments;
          const points = [];
          for(let i = 0; i < segments.length; i++) {
              const segment = segments[i];
              let start = segment[0];
              let end = segment[1];
              points.push(new THREE.Vector3(start[0], start[1], start[2]));
              points.push(new THREE.Vector3(end[0], end[1], end[2]));
          }
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          let material = new THREE.LineBasicMaterial({
              color: path.color,
              linewidth: path.width
          });
          const line = new THREE.Line(geometry, material);
          scene.add(line);
      });
}

function fetchAndPlotRadioDevices() {
    let requestBody = {
        "base_stations" : [
            {
                "id" : 1,
                "location" : [0, 100, 20],
                "name" : "Example gNodeB"
            }
        ],
        "user_equipments" : [
            {
                "id" : 1,
                "location" : [80, 100, 1.5],
                "name" : "Example nrUE",
                "type" : "fixed"
            }
        ]
    }

    fetch('http://localhost:8001/session/' + sessionID + '/deployment/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })
      .then(response => {
          if(!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(fetchResult => {
          const rendered = fetchResult.rendered_deployment;
          const points = rendered.points;
          const colors = rendered.colors;
          let geo = new BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
          geo.setAttribute('color', new THREE.Float32BufferAttribute(colors.flat(), 3));

          // TODO Python side: sprite size
          let texture = new THREE.DataTexture(
            new THREE.Float32BufferAttribute(rendered.sprite.flat()),
            128, 128
          );
          texture.format = THREE.RGBAFormat;
          texture.type = THREE.FloatType;
          let material = new THREE.PointsMaterial({
              size: 2 * rendered.radius,
              vertexColors: true,
              sizeAttenuation: true,
              alphaTest: 0.5,
              transparent: true,
              // map: texture,
          });
          let mesh = new THREE.Points(geo, material);
          scene.add(mesh)
          startSessionSimulation();
      });
}

function fetchAndPlotMeshes() {
    fetch('http://localhost:8001/session/' + sessionID)
      .then(response => {
          if(!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(fetchResult => {
          const sceneData = fetchResult.scene;
          console.log(sceneData.name, sceneData.description);
          const sceneGeometry = sceneData.geometry;

          const vertices = sceneGeometry.vertices;
          const faces = sceneGeometry.faces;
          const colors = sceneGeometry.colors;
          let geo = new THREE.BufferGeometry();
          geo.setIndex(faces.flat());
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
          setupCamera(camera, controls, mesh);
          fetchAndPlotRadioDevices();
      })
}

createNewSession();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
