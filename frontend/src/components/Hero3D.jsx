import { useEffect, useRef } from "react";
import * as THREE from "three";

/*
  The hero visual IS the subject matter, made literal: a fanned stack of
  case-file pages (what you feed in) with the citation graph (what comes
  out) floating above it, connected by the same convergence animation —
  as if the graph is being extracted from the filings in real time. This
  replaced an earlier version that was just a floating abstract graph with
  no visual tie to "documents," which is the actual product.

  The one orchestrated motion moment (per design guidance: spend motion
  budget on ONE deliberate sequence): nodes spawn scattered outside the
  frame and converge into their final graph layout over ~1.6s on mount.
  After that, only a slow ambient rotation plus cursor-parallax continue —
  nothing else animates on its own. prefers-reduced-motion skips both.
*/

function buildPageStack(scene) {
  const pageGeo = new THREE.PlaneGeometry(2.6, 3.4);
  const pageMat = new THREE.MeshBasicMaterial({
    color: "#f6f2e8",
    transparent: true,
    opacity: 0.055,
    side: THREE.DoubleSide,
  });
  const pageEdgeMat = new THREE.LineBasicMaterial({ color: "#f6f2e8", transparent: true, opacity: 0.16 });

  const group = new THREE.Group();
  const pageCount = 6;
  const meshes = [];
  for (let i = 0; i < pageCount; i++) {
    const mesh = new THREE.Mesh(pageGeo, pageMat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(pageGeo), pageEdgeMat);
    // fan the pages slightly, like an open case file spread on a desk
    const fanAngle = (i - pageCount / 2) * 0.05;
    mesh.rotation.set(-0.4, fanAngle, 0);
    mesh.position.set(fanAngle * 1.3, -1.5 - i * 0.03, -1.1 - i * 0.18);
    edges.rotation.copy(mesh.rotation);
    edges.position.copy(mesh.position);
    group.add(mesh);
    group.add(edges);
    meshes.push(mesh);
  }
  scene.add(group);
  return { group, geo: pageGeo, mat: pageMat, edgeMat: pageEdgeMat, meshes };
}

export default function Hero3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const pageStack = buildPageStack(scene);

    // --- graph data: a small case-citation network, floating above the pages ---
    const nodeCount = 14;
    const finalPositions = [];
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      finalPositions.push(
        new THREE.Vector3(
          2.5 * Math.cos(theta) * Math.sin(phi),
          0.7 + 1.8 * Math.sin(theta) * Math.sin(phi),
          2.5 * Math.cos(phi) * 0.7
        )
      );
    }
    const startPositions = finalPositions.map(
      (p) => p.clone().multiplyScalar(4).add(
        new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
      )
    );

    const brass = new THREE.Color("#c89b5c");
    const garnet = new THREE.Color("#9c4550");
    const nodeGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const brassMat = new THREE.MeshBasicMaterial({ color: brass });
    const garnetMat = new THREE.MeshBasicMaterial({ color: garnet });
    // ~1 in 5 nodes gets the garnet accent — a deliberate minority highlight,
    // not a 50/50 split, so it reads as accent rather than a second palette.
    const nodes = finalPositions.map((pos, i) => {
      const mesh = new THREE.Mesh(nodeGeo, i % 5 === 0 ? garnetMat : brassMat);
      mesh.position.copy(startPositions[i]);
      scene.add(mesh);
      return mesh;
    });

    // edges: connect each node to its 2 nearest neighbours (a plausible
    // citation-density approximation for a demo visual)
    const edgePairs = [];
    finalPositions.forEach((p, i) => {
      const distances = finalPositions
        .map((q, j) => ({ j, d: i === j ? Infinity : p.distanceTo(q) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      distances.forEach(({ j }) => {
        const key = [i, j].sort().join("-");
        if (!edgePairs.find((e) => e.key === key)) edgePairs.push({ key, i, j });
      });
    });

    const edgeMat = new THREE.LineBasicMaterial({ color: brass, transparent: true, opacity: 0.35 });
    const edgeLines = edgePairs.map(({ i, j }) => {
      const geo = new THREE.BufferGeometry().setFromPoints([startPositions[i], startPositions[j]]);
      const line = new THREE.Line(geo, edgeMat);
      scene.add(line);
      return { line, i, j };
    });

    // a few faint "extraction threads" from the page stack up to the
    // nearest graph nodes — this is the visual link between "documents"
    // and "graph," not just two unrelated groups sharing a frame
    const threadMat = new THREE.LineBasicMaterial({ color: brass, transparent: true, opacity: 0.12 });
    const threadCount = 5;
    const threads = [];
    for (let i = 0; i < threadCount; i++) {
      const pageAnchor = new THREE.Vector3(0, -1.6, -1.4);
      const target = finalPositions[i * 2];
      const geo = new THREE.BufferGeometry().setFromPoints([pageAnchor, target]);
      const line = new THREE.Line(geo, threadMat);
      scene.add(line);
      threads.push({ line, target, pageAnchor });
    }

    const group = new THREE.Group();
    nodes.forEach((n) => group.add(n));
    edgeLines.forEach(({ line }) => group.add(line));
    threads.forEach(({ line }) => group.add(line));
    group.add(pageStack.group);
    scene.add(group);

    function disposeAll() {
      mount.removeChild(renderer.domElement);
      nodeGeo.dispose();
      brassMat.dispose();
      garnetMat.dispose();
      edgeMat.dispose();
      threadMat.dispose();
      edgeLines.forEach(({ line }) => line.geometry.dispose());
      threads.forEach(({ line }) => line.geometry.dispose());
      pageStack.geo.dispose();
      pageStack.mat.dispose();
      pageStack.edgeMat.dispose();
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      // Skip the convergence animation and ambient spin entirely — render
      // the final graph layout once, statically.
      nodes.forEach((mesh, i) => mesh.position.copy(finalPositions[i]));
      edgeLines.forEach(({ line, i, j }) => {
        line.geometry.setFromPoints([nodes[i].position, nodes[j].position]);
      });
      threads.forEach(({ line, target, pageAnchor }) => {
        line.geometry.setFromPoints([pageAnchor, target]);
      });
      renderer.render(scene, camera);
      return disposeAll;
    }

    let start = null;
    const duration = 1600; // ms — the one orchestrated entrance
    let rafId;

    // subtle parallax: the whole scene tilts slightly toward the cursor,
    // responding to the user rather than animating on its own
    let pointerX = 0;
    let pointerY = 0;
    function handlePointerMove(e) {
      const rect = mount.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    mount.addEventListener("mousemove", handlePointerMove);

    function animate(ts) {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      nodes.forEach((mesh, i) => {
        mesh.position.lerpVectors(startPositions[i], finalPositions[i], eased);
      });
      edgeLines.forEach(({ line, i, j }) => {
        line.geometry.setFromPoints([nodes[i].position, nodes[j].position]);
      });
      threads.forEach(({ line, target, pageAnchor }) => {
        const animatedTarget = nodes[finalPositions.indexOf(target)]?.position ?? target;
        line.geometry.setFromPoints([pageAnchor, animatedTarget]);
      });

      // gentle ambient rotation, plus a small cursor-driven tilt on top
      group.rotation.y += 0.0012;
      group.rotation.x = Math.sin(elapsed / 4000) * 0.08 + pointerY * 0.12;
      group.rotation.z = pointerX * 0.05;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);

    function handleResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("mousemove", handlePointerMove);
      disposeAll();
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
