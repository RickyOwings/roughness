const data = {
    get profileDataset() {
        const elem = document.getElementById("profileDataset");
        if (elem instanceof HTMLSelectElement) {
            return elem.value;
        }
        return null;
    },
    get waveCount() {
        const elem = document.getElementById("waveCount");
        if (elem instanceof HTMLInputElement) {
            return parseFloat(elem.value);
        }
        return null;
    },

    get amplitude() {
        const elem = document.getElementById("amplitude");
        if (elem instanceof HTMLInputElement) {
            return parseFloat(elem.value);
        }
        return null;
    },

    get points() {
        const elem = document.getElementById("points");
        if (elem instanceof HTMLInputElement) {
            return parseInt(elem.value);
        }
        return null;
    },

    get gaussSize() {
        const elem = document.getElementById("gaussSize");
        if (elem instanceof HTMLInputElement) {
            return parseFloat(elem.value);
        }
        return null;
    },

    get surfaceProfileChk() {
        const elem = document.getElementById("surfaceProfile");
        if (elem instanceof HTMLInputElement) {
            return elem.checked;
        }
        return null;
    },

    get meanLineChk() {
        const elem = document.getElementById("meanLine");
        if (elem instanceof HTMLInputElement) {
            return elem.checked;
        }
        return null;
    },


    get distFromMeanChk() {
        const elem = document.getElementById("distFromMean");
        if (elem instanceof HTMLInputElement) {
            return elem.checked;
        }
        return null;
    },


    waveFns: {
        "sinewave": function() {
            const {waveCount, amplitude, points} = data;
            if (
                waveCount === null ||
                amplitude === null ||
                points    === null
            ) return null;

            /** @type {number[]} */
            let arr = [];

            for(let i = 0; i < points; i++) {
                arr.push(Math.sin(i * Math.PI * 2 / points * waveCount) * amplitude);
            }

            return arr;
        },
        "trianglewave": function() {
            const {waveCount, amplitude, points} = data;
            if (
                waveCount === null ||
                amplitude === null ||
                points    === null
            ) return null;

            /** @type {number[]} */
            let arr = [];
            let last = 0;
            let up = true;
            for(let i = 0; i < points; i++) {
                arr.push(last);
                last += ((up) ? 1 : -1) * 4 * waveCount * amplitude / points;
                if (last > amplitude) {
                    up = !up;
                    last = amplitude;
                }
                if (last < -amplitude) {
                    up = !up;
                    last = -amplitude;
                }
            }

            return arr;
        },
        "squarewave": function() {
            const {waveCount, amplitude, points} = data;
            if (
                waveCount === null ||
                amplitude === null ||
                points    === null
            ) return null;

            /** @type {number[]} */
                let arr = [];

            for(let i = 0; i < points; i++) {
                const sin = Math.sin(i * Math.PI * 2 / points * waveCount) * amplitude;
                arr.push((sin > 0) ? amplitude : -amplitude);
            }

            return arr;
        },
    },
    generateProfile() {
        const {profileDataset} = this;
        if (profileDataset === null) return;
        /** @type {number[]} */
        let arr;
        switch(profileDataset) {
            case "sinewave":
                arr = this.waveFns.sinewave();
                break;
            case "trianglewave":
                arr = this.waveFns.trianglewave();
                break;
            case "squarewave":
                arr = this.waveFns.squarewave();
                break;
        }
        return arr;
    },

    /**
    * @param {number[]} profile 
    * @param {number} kernelSize - integer
    */
    gaussianFilter(profile, kernelSize) {
        kernelSize = Math.round(kernelSize);

        let arr = [];
        let kernel = [];
        for(let i = -kernelSize; i < kernelSize; i++) {
            kernel.push(Math.exp(-(i * i) / (0.1 * kernelSize * kernelSize)));
        }

        console.log(kernel);

        for(let i = 0; i < profile.length; i++) {
            let sum = 0;
            let count = 0;
            for(let j = 0; j < kernel.length; j++) {
                let k = j - kernelSize;
                if (i + k < 0) {
                    //count += kernel[j];
                    continue;
                }
                if (i + k >= profile.length) {
                    //count += kernel[j];
                    continue;
                }
                sum += profile[i + k] * kernel[j];
                count += kernel[j];
            }
            arr.push(sum / count);
        }
        return arr;
    },

    /**
    * @param {number[]} profile 
    * @param {number[]} gauss 
    */
    roughnessProfile(profile, gauss) {
        let arr = [];
        for(let i = 0; i < profile.length; i++) {
            arr.push(profile[i] - gauss[i]);
        }
        return arr;
    },


    calculateRA(profile) {
        let sum = 0;
        for(let i = 0; i < profile.length; i++) {
            sum += Math.abs(profile[i]);
        }
        return sum / profile.length;

    },

    /**
    * @param {number[]} profile 
    */
    calculateRMS(profile) {
        let sum = 0;
        for(let i = 0; i < profile.length; i++) {
            sum += profile[i] ** 2;
        }
        return Math.sqrt(sum / profile.length);
    }
};

/**
    * @param {HTMLCanvasElement} canvas 
    */
function renderGraph(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); { // center line
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }
    ctx.save(); {
        const profile = data.generateProfile();
        const gaussSize = data.gaussSize * profile.length;
        const max = Math.max(...profile);
        const min = Math.min(...profile);

        /**
            * @param {number} value
            */
        const mapping = (value) => {
            let iota = value;
            iota -= min;
            iota /= max - min;
            iota = 1 - iota;
            iota *= canvas.height;
            return iota;
        }

        if (data.surfaceProfileChk) {
            ctx.beginPath();
            ctx.moveTo(0, mapping(profile[0]));
            for(let i = 0; i < profile.length; i++) {
                const x = canvas.width / profile.length * i;
                ctx.lineTo(x, mapping(profile[i]));
            }
            ctx.stroke();
            ctx.closePath();
        }

        const gauss = data.gaussianFilter(profile, gaussSize);

        if (data.meanLineChk) {
            ctx.strokeStyle = "blue";
            ctx.beginPath();
            ctx.moveTo(0, mapping(gauss[0]));
            for(let i = 0; i < gauss.length; i++) {
                const x = canvas.width / gauss.length * i;
                ctx.lineTo(x, mapping(gauss[i]));
            }
            ctx.stroke();
            ctx.closePath();
        }

        const rProfile = data.roughnessProfile(profile, gauss);
        if (data.distFromMeanChk) {
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.moveTo(0, mapping(rProfile[0]));
            for(let i = 0; i < rProfile.length; i++) {
                const x = canvas.width / rProfile.length * i;
                ctx.lineTo(x, mapping(rProfile[i]));
            }
            ctx.stroke();
            ctx.closePath();
        }


        ctx.restore();
        const rq = data.calculateRMS(rProfile);
        const ra = data.calculateRA(rProfile);
        document.getElementById("stats").innerHTML = `
        Ra: ${ra}<br>
        Rq: ${rq}<br>
        Rmax/Ry: ${max - min},
        `;
    };
}

renderGraph(document.getElementById("graph"));

document.querySelectorAll(".SurfForm").forEach(function(element){
    if (element instanceof HTMLFormElement) {
        element.addEventListener("submit", function(event){
            event.preventDefault();
        });
        element.addEventListener("input", function(event){
            renderGraph(document.getElementById("graph"));
        })
    }
});
