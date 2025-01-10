//
// By Dakotys
// https://github.com/Dakotys
//

(function shadertoyPluginParameters() {
	function getParameters() {
		// get id of common tab
		const commonTabImg = document.querySelector("img[src='/img/common.png']");
		if (!commonTabImg) return {};
		const commonTabId = Number.parseInt(commonTabImg.parentNode.id[3]);

		// get content of common tab
		const content = window.gShaderToy.mPass[commonTabId].mDocs.getValue();

		// get parameters from content
		const match = content.match(
			/\/\*[\s]*shadertoy-plugin parameters[\s\S]*?\*\//,
		); // Match the parameters comment block

		if (!match) return {};

		const parametersString = match[0]
			.replace(/\/\*\s*shadertoy-plugin parameters\s*/, "") // Remove the comment marker at start and "shadertoy-plugin parameters" line
			.replace(/\*\//, "") // Remove the closing comment marker
			.trim();

		try {
			return JSON.parse(parametersString); // Parse the parameters string as JSON
		} catch (error) {
			console.error("Error parsing shader parameters:", error);
			console.error(parametersString);
			return {};
		}
	}

	function evaluateParameters() {
		const params = getParameters();

		if (params.textures) {
			params.textures.forEach((texture, index) => {
				window.gShaderToy.mEffect.NewTexture(0, index, {
					mSrc: texture,
					mType: "texture",
					mID: 0,
					mSampler: {
						filter: "mipmap",
						wrap: "repeat",
						vflip: "true",
						srgb: "false",
						internal: "byte",
					},
				});
			});
		}

		if (params.canvas) {
			const canvas = document.getElementById("demogl");
			canvas.style.margin = "auto";

			const xres = params.canvas.width;
			const yres = params.canvas.height;

			if (!Number.isInteger(xres) || !Number.isInteger(yres)) {
				return;
			}

			const mE = gShaderToy.mEffect;

			mE.mCanvas.setAttribute('width', xres);
			mE.mCanvas.setAttribute('height', yres);

			mE.mCanvas.width = xres;
			mE.mCanvas.height = yres;

			mE.mXres = xres;
			mE.mYres = yres;

            mE.ResizeBuffers(xres, yres);

			gShaderToy.iSetResolution(xres, yres);

			canvas.style.aspectRatio = `${xres}/${yres}`;

			if (xres <= canvas.clientWidth) {
				canvas.style.width = `${xres}px`;
			} else {
				canvas.style.width = "100%";
			}

			console.log(canvas.clientWidth, canvas.clientHeight);
			window.dispatchEvent(new Event("resize"));
		}
	}

	// Evaluate parameters on load
	setTimeout(evaluateParameters, 300);

	// Refresh textures on compile
	const compileButton = document.getElementById("compileButton");
	compileButton.addEventListener("click", () => {
		evaluateParameters();
	});
})();
