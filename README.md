# Fractal Tree

The goal of this project is to generate fractal-like pine tree structures using Three.js.

Below is a demonstration video.

[![](https://markdown-videos.deta.dev/youtube/t339l2b7s3s)](https://youtu.be/t339l2b7s3s)

# How to run the application

The easiest way to play with this project is to visit the online version at https://fractal-tree-356c3.web.app/.

Otherwise, download the code and host it on a local web server.

# How to use

## Generating a tree
Use the options on the left-side panel to impact the generated tree.

- ___Recursion depth___: This is the amount of times the root branch will fork to create children branches.
- ___Min. number of children___: This is the minimum number of forked branch from any given branch.
- ___Max. number of children___: This is the maximum number of forked branch from any given branch.
- ___Generate___: Click on this button to generate a new tree in the scene.

## 3D space navigation
- ___Left-click and mouse drag___: Orbit around the tree
- ___Right-click and mouse drag___: Pan the camera
- ___Mouse wheel___: Control the zoom

## Controls
- ___Reset View___: Click on this button to reset the camera view to the original position.
- ___Play/Pause animation___: Click on this button to animate the tree. All branches rotate around their parent branch.
- ___Animation speed___: Control how fast the branches rotate using the slider.

## Adding branches
You can add branches to the tree as long as the animation is paused. To do so, simply left-click on a branch using the mouse. While hovering the mouse over a branch, use the preview sphere to have an idea of the new branch's position and orientation.