// Permet de récupérer les projets d'un compte prototypo
window['prototypo-projects'].getProjects('email', 'password').then(function (fonts) {
    // Recherche la famille dans la liste de projets
    var family = fonts.find(function (font) {
        return font.name === 'Familyname';
    });
    // Recherche la variante dans les variantes de la famille
    var variant = family && family.variants.find(function (variant) {
        return variant.name === 'VariantName';
    });
    // Récupère les valeurs nécessaires à initialiser la police
    var template = family.template;
    var values = variant.values;
    var ptypoFont;

    var prototypo = new Ptypo.default('b1f4fb23-7784-456e-840b-f37f5a647b1c');
    // Crée une font 'testfont' en utilisant le template récupéré
    // la font 'testfont' a étée ajoutée à la page en css via une font-family
    prototypo.createFont('testfont', template).then(function (createdFont) {
        ptypoFont = createdFont;
        // Change les paramètres de la font créée en utilisant les valeurs récupérées du compte
        createdFont.changeParams(values);
    });

    var text = $('.text p').text();

    /**************************GESTION DU SON *******************/
    /************************************************************/

    // Permet de calculer une valeur "réaliste" pour le paramètre en fonction de la valeur de fréquence reçue
    var calculateValue = function (param, freqValue) {
        switch (param) {
            case 'thickness':
                return freqValue / 3 + 4;
                break;
            case 'width':
                return (freqValue / 230) + 0.45;
                break;
            case 'xHeight':
                return (freqValue * 1.5) + 400;
                break;
            case 'curviness':
                return (freqValue / 160);
                break;
            case 'slant':
                return (freqValue / 10) - 3;
                break;
            default:
                break;
        }
    }

    // Permet de sélectionner quel paramète on souhaite associer à la fréquence
    var getParamByFreq = function (chosenFreq) {
        switch (chosenFreq) {
            case 'Low':
                return 'thickness';
                break;
            case 'Medium':
                return 'width';
                break;
            case 'High':
                return 'slant';
                break;
            default:
                break;
        }
    }

    // Fonction appelée pendant l'analyse du flux audio permettant de changer les paramètres de la police pour chaque fréquence
    var updateFont = _.debounce(function (low, med, high) {
        if (low !== 0) {
            ptypoFont.changeParam(getParamByFreq('Low'), calculateValue(getParamByFreq('Low'), low), text)
        }
        if (med != 0) {
            ptypoFont.changeParam(getParamByFreq('Medium'), calculateValue(getParamByFreq('Medium'), med), text)
        }
        if (high !== 0) {
            ptypoFont.changeParam(getParamByFreq('High'), calculateValue(getParamByFreq('High'), high), text)
        }
    }, 10);

    var isRaf = false;


    // Fonction exécutée si la capture audio est acceptée, lance l'analyse
    var soundAllowed = function (stream) {

        // Configuration de l'analyse du stream
        window.persistAudioStream = stream;
        var audioContent = new (window.AudioContext || window.webkitAudioContext)();
        var audioStream = audioContent.createMediaStreamSource(stream);
        var analyser = audioContent.createAnalyser();
        audioStream.connect(analyser);
        analyser.fftSize = 1024;
        var frequencyArray = new Uint8Array(analyser.frequencyBinCount);
        var lastMedValue = 0;
        var lastLowValue = 0;
        var lastHighValue = 0;

        // Boucle d'analyse
        var doDraw = function () {
            if (!isRaf) {
                requestAnimationFrame(doDraw);
            }
            isRaf = true;
            analyser.getByteFrequencyData(frequencyArray);
            var adjustedLength;
            var updateTrigger = 20;
            // On ne travaille que sur les premières valeurs de l'objet, on le compresse.
            for (var i = 0; i < 255; i++) {
                adjustedLength = Math.floor(frequencyArray[i]) - (Math.floor(frequencyArray[i]) % 5);
            }
            // low : les 10 premiers blocs des 255
            var total = 0;
            for (var i = 1; i < 10; i++) {
                total += frequencyArray[i];
            }
            var low = total / 9;
            // On ajuste la valeur pour faciliter les calculs de paramètres
            var adjustedLow = Math.floor(low) - (Math.floor(low) % 5);
            //medium : les 10 suivants
            total = 0;
            for (var i = 11; i < 21; i++) {
                total += frequencyArray[i];
            }
            var med = total / 10;
            // On ajuste la valeur pour faciliter les calculs de paramètres
            var adjustedMed = Math.floor(med) - (Math.floor(med) % 5);
            // high : les 10 suivants
            total = 0;
            for (var i = 30; i < 40; i++) {
                total += frequencyArray[i];
            }
            var high = total / 10;
            // On ajuste la valeur pour faciliter les calculs de paramètres
            var adjustedHigh = Math.floor(high) - (Math.floor(high) % 5);

            // Si la différence capturée de son est suffisante, on met à jour la fonte
            if (Math.abs(lastLowValue - low) > updateTrigger || Math.abs(lastMedValue - med) > updateTrigger || Math.abs(lastHighValue - high) > updateTrigger) {

                updateFont(adjustedLow, adjustedMed, adjustedHigh);
                isRaf = false;
            } else {
                isRaf = false;
            }

        }
        doDraw();
    }

    // Configuration de l'accès au micro
    $('.js-button-getAudio').on('click', function () {
        if (navigator.getUserMedia) {
            window.navigator = window.navigator || {};
            navigator.getUserMedia = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                null
            navigator.getUserMedia({ audio: true }, soundAllowed, function () { console.log('sound not allowed') });
        } else if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function (stream) {
                    if (!listening) {
                        soundAllowed(stream);
                    }
                })
        }
    });

});


/****************Librairie Prototypo **************/

// createFont(fontName, fontTemplate)
// crée une fonte 'fontName' utilisable en CSS via une balise font-family en utilisant le template 'fontTemplate'


// ptypofont.changeParam(paramName, paramValue, subset)
// Change le paramètre 'paramname' de la font 'ptypofont' en lui donnant la valeur 'paramValue';
// Possibilité de limiter les caractères modifiés en donnant un 'subset' : chaîne de caractères, pas besoin que ça soit unique

// ptypofont.changeParams(paramObj, subset)
// Change les paramètres de la font 'ptypofont' selon l'objet de paramètres donné
// {'thickness': 110, 'width': 1}
// Possibilité de limiter les caractères modifiés en donnant un 'subset' : chaîne de caractères, pas besoin que ça soit unique


// ptypofont.tween(paramName, paramValue, steps, aDuration, cb, subset)
// Anime la fonte 'ptypofont' pendant 'aDuration' secondes en faisant varier 'steps' fois le 'paramName' jusqu'à 'paramValue'
// Renvoie 'cb' (fonction) quand terminé
// Possibilité de limiter les caractères modifiés en donnant un 'subset' : chaîne de caractères, pas besoin que ça soit unique

// ptypofont.getArrayBuffer()
// Renvoie l'arrayBufer de la font 'ptypofont'

// ptypofont.reset(subset)
// Réinitialise la font 'ptypofont' en lui redonnant les valeurs du template de base
// Possibilité de limiter les caractères modifiés en donnant un 'subset' : chaîne de caractères, pas besoin que ça soit unique

