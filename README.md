# ShaderToy unofficial plugin.

Extension to make Shadertoy coding more comfortable.
[Chrome Web Store](https://chrome.google.com/webstore/detail/shadertoy-unofficial-plug/ohicbclhdmkhoabobgppffepcopomhgl?hl=pl)

## Info

Please report bugs and request feature [here](https://github.com/patuwwy/ShaderToy-Chrome-Plugin/issues)

## Features:

* Adjustable slider for full control of 'iGlobalTime' uniform and audio/video inputs.

* Four sliders simulating mouse position with the same range.
  This can be used to tweaking variables with iMouse.xyzw uniform.

* Switchable dark color theme.

* Sorting shaders list by views, likes or comments on "My profile" page.

* Shaders previews on "My profile" page.

* Change resolution in windowed and fullscreen mode by pressing keys 1...9.

  Resolution is divided by pressed key value, for example:

  Key '2' divides by 2, 1920x1080 becomes 960x540.
  Key '8' divides by 9, 1920x1080 becomes 240x135.

  This allows to run shaders smoothly (even in fullscreen) on non-top GPUs.
  Notice that lower resolution is interpolated to original size. This causes blurrish rendering. For pixelated image, rendering mode switch has been added.

* Take HQ screenshot. Screenshot resolution is 2 * current resolution (including current resolution divider). 1920x1080 becomes 3840x2160.

* Pause/Restart in fullscreen mode.

* Fullscreen edit mode.

* Cloning own shaders with one click!

## Screenshots

![](./screenshots/screen3.jpg)

![](./screenshots/previews.jpg)
Preview images on profile page with detail overlay on mouse hover

![](./screenshots/screen2.jpg)
Fullscreen edit (dark theme)

![](./screenshots/screen1.jpg)
main page (dark theme)


## ShaderToy extension changelog:

* 0.7.6
Loop switch fix.

* 0.7.5
Correct value for iFrame uniform.

* 0.7.4
Confirm shader cloning when original shader has not been saved

* 0.7.2
Cloning own shaders. No more copying uniforms and passes by hand.
Images for Github preview removed. One image added.

* 0.7.1
Time looping.

* 0.7.0
HQ Screenshot
Code cleanup
Minor style changes

* 0.6.3
Dark theme updated.
Shaders preview on profile page updated.

* 0.6.2
iMouse uniform sliders fix for paused state.
Sliders initial value.
Change in extension popup appearance.
Dark theme update.

* 0.6.0
iMouse uniform sliders.

* 0.5.1
Minor changes. Nothing new. Mostly code styling.

* 0.5.0
Added preview images on profile page.

* 0.4.1
Changed key bindings.
Changes in popup (show version, ui).
Removed Google Analytics (can not manage how to make it work ;)
Removed open github page when updated.

* 0.4.0
Timebar added.

* 0.3.3
Take screenshot in current resolution.
Fullscreen edit mode key changed to SHIFT + SPACE.
Google Analytics added.
Moved preview screens to screenshots folder.

* 0.3.2
Minor update.
CSS fix for showing user picture on [Profile page](https://www.shadertoy.com/profile) (both themes)
Extension opens changelog on update/first install.

* 0.3.1
Exclude running shader on login page.
Added Chrome rendering mode select.

* 0.3.0
Refactoring.
Switchable dark theme.
Extension styling.
Dark theme fixes.

* 0.2.5
Show plugin popup only when on Shadertoy.com.

* 0.2.3
Added sort shaders by views/likes/comments on "My profile" page.

* 0.2.2
Git

* 0.2.1
JSDoc

* 0.2.0
Basic implementation of fullscreen edit

* 0.1.1
Added pause/restart time in fullscreen mode

* 0.1.0
Added basic dark theme

* 0.0.1
Change resolution by keys 1...9


## Contributors:

[movAX13h](http://blog.thrill-project.com/)
