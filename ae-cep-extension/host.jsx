var AEAgentCore = {
    dispatch: function (id, action, payloadJson) {
        var payload = this.parsePayload(payloadJson);
        if (action === "execute_raw_jsx") {
            return this.executeRawJsx(id, payload);
        }
        if (action === "get_active_context") {
            return this.getActiveContext(id);
        }
        if (action === "get_comp_tree") {
            return this.getCompTree(id, payload);
        }
        if (action === "get_layer_info") {
            return this.getLayerInfo(id, payload);
        }
        if (action === "apply_expression") {
            return this.applyExpression(id, payload);
        }
        if (action === "create_solid_layer") {
            return this.createSolidLayer(id, payload);
        }
        if (action === "get_comp_structure_summary") {
            return this.getCompStructureSummary(id, payload);
        }
        if (action === "clone_comp_structure") {
            return this.cloneCompStructure(id, payload);
        }
        if (action === "set_layer_parent") {
            return this.setLayerParent(id, payload);
        }
        if (action === "create_text_layer") {
            return this.createTextLayer(id, payload);
        }
        if (action === "batch_rename_layers") {
            return this.batchRenameLayers(id, payload);
        }
        if (action === "add_effect") {
            return this.addEffect(id, payload);
        }
        if (action === "add_keyframes_batch") {
            return this.addKeyframesBatch(id, payload);
        }
        if (action === "precompose_layers") {
            return this.precomposeLayers(id, payload);
        }
        if (action === "create_composition") {
            return this.createComposition(id, payload);
        }
        if (action === "set_property_value") {
            return this.setPropertyValue(id, payload);
        }
        return this.error(id, "Unsupported action: " + action);
    },

    parsePayload: function (payloadJson) {
        if (!payloadJson) return {};
        try {
            return eval("(" + payloadJson + ")");
        } catch (e) {
            return {};
        }
    },

    executeRawJsx: function (id, payload) {
        var hasUndo = false;
        var script = payload && payload.script ? String(payload.script) : "";
        try {
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            eval(script);
            if (hasUndo) {
                app.endUndoGroup();
                hasUndo = false;
            }
            return this.success(id, { message: "Executed" });
        } catch (e) {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
            return this.error(id, e.toString(), e.line);
        }
    },

    getActiveContext: function (id) {
        try {
            var comp = app.project && app.project.activeItem ? app.project.activeItem : null;
            if (!comp || !(comp instanceof CompItem)) {
                return this.error(id, "No active composition");
            }
            var selectedLayers = [];
            var selectedProperties = [];
            var layers = comp.selectedLayers;
            var i = 0;
            for (i = 0; i < layers.length; i += 1) {
                var layer = layers[i];
                selectedLayers.push({
                    index: layer.index,
                    name: layer.name,
                    type: this.getLayerType(layer)
                });
                this.pushLayerSelectedProperties(layer, selectedProperties);
            }
            return this.success(id, {
                activeComp: {
                    id: this.getCompId(comp),
                    name: comp.name,
                    width: comp.width,
                    height: comp.height,
                    frameRate: comp.frameRate
                },
                selectedLayers: selectedLayers,
                selectedProperties: selectedProperties
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        }
    },

    getCompTree: function (id, payload) {
        try {
            var comp = this.findCompByName(payload && payload.compName ? payload.compName : "");
            var detail = this.normalizeLayerDetail(payload && payload.detail ? payload.detail : "basic");
            if (!comp) {
                return this.error(id, "Composition not found");
            }
            var layers = [];
            var i = 0;
            for (i = 1; i <= comp.numLayers; i += 1) {
                var layer = comp.layer(i);
                layers.push(this.buildLayerInfo(layer, detail, false));
            }
            return this.success(id, {
                comp: {
                    id: this.getCompId(comp),
                    name: comp.name
                },
                detail: detail,
                layers: layers
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        }
    },

    getLayerInfo: function (id, payload) {
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var layerIndex = payload && typeof payload.layerIndex !== "undefined" ? Number(payload.layerIndex) : 0;
            var detail = this.normalizeLayerDetail(payload && payload.detail ? payload.detail : "basic");
            if (!compName || !isFinite(layerIndex) || layerIndex < 1) {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            if (layerIndex > comp.numLayers) {
                return this.error(id, "Layer index out of range: " + layerIndex);
            }
            return this.success(id, this.buildLayerInfo(comp.layer(layerIndex), detail, true));
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        }
    },

    applyExpression: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var layerIndex = payload && payload.layerIndex ? Number(payload.layerIndex) : 0;
            var propertyMatchName = payload && payload.propertyMatchName ? String(payload.propertyMatchName) : "";
            var expression = payload && payload.expression ? String(payload.expression) : "";
            if (!compName || !layerIndex || !propertyMatchName) {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            if (layerIndex < 1 || layerIndex > comp.numLayers) {
                return this.error(id, "Layer index out of range: " + layerIndex);
            }
            var layer = comp.layer(layerIndex);
            var target = this.findPropertyByMatchName(layer, propertyMatchName);
            if (!target) {
                return this.error(id, "Property not found by matchName: " + propertyMatchName);
            }
            if (!target.canSetExpression) {
                return this.error(id, "Property cannot set expression: " + propertyMatchName);
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            target.expression = expression;
            if (hasUndo) {
                app.endUndoGroup();
                hasUndo = false;
            }
            return this.success(id, {
                compName: compName,
                layerIndex: layerIndex,
                propertyMatchName: propertyMatchName,
                applied: true
            });
        } catch (e) {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
            return this.error(id, e.toString(), e.line);
        }
    },

    createSolidLayer: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var name = payload && payload.name ? String(payload.name) : "";
            var width = payload && payload.width ? Number(payload.width) : 0;
            var height = payload && payload.height ? Number(payload.height) : 0;
            var color = payload && payload.color ? payload.color : null;
            if (!compName || !name || !width || !height || !(color instanceof Array) || color.length !== 3) {
                return this.error(id, "Missing required payload fields");
            }
            if (width <= 0 || height <= 0) {
                return this.error(id, "Width and height must be positive numbers");
            }
            var c0 = Number(color[0]);
            var c1 = Number(color[1]);
            var c2 = Number(color[2]);
            if (!isFinite(c0) || !isFinite(c1) || !isFinite(c2)) {
                return this.error(id, "Color channels must be numbers");
            }
            if (c0 < 0 || c0 > 1 || c1 < 0 || c1 > 1 || c2 < 0 || c2 > 1) {
                return this.error(id, "Color channels must be in range 0-1");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var layer = comp.layers.addSolid([c0, c1, c2], name, width, height, 1);
            if (hasUndo) {
                app.endUndoGroup();
                hasUndo = false;
            }
            return this.success(id, {
                compName: compName,
                name: name,
                width: width,
                height: height,
                color: [c0, c1, c2],
                layerIndex: layer.index
            });
        } catch (e) {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
            return this.error(id, e.toString(), e.line);
        }
    },

    getCompStructureSummary: function (id, payload) {
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            if (!compName) {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            return this.success(id, this.buildCompStructureSummary(comp));
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        }
    },

    cloneCompStructure: function (id, payload) {
        var hasUndo = false;
        try {
            var sourceCompName = payload && payload.sourceCompName ? String(payload.sourceCompName) : "";
            var newCompName = payload && payload.newCompName ? String(payload.newCompName) : "";
            if (!sourceCompName || !newCompName) {
                return this.error(id, "Missing required payload fields");
            }
            var sourceComp = this.findCompByName(sourceCompName);
            if (!sourceComp) {
                return this.error(id, "Composition not found: " + sourceCompName);
            }
            if (this.findCompByName(newCompName)) {
                return this.error(id, "Composition already exists: " + newCompName);
            }
            var width = payload && typeof payload.width !== "undefined" ? Number(payload.width) : sourceComp.width;
            var height = payload && typeof payload.height !== "undefined" ? Number(payload.height) : sourceComp.height;
            var duration = payload && typeof payload.duration !== "undefined" ? Number(payload.duration) : sourceComp.duration;
            var frameRate = payload && typeof payload.frameRate !== "undefined" ? Number(payload.frameRate) : sourceComp.frameRate;
            if (!isFinite(width) || !isFinite(height) || !isFinite(duration) || !isFinite(frameRate)) {
                return this.error(id, "Width, height, duration and frameRate must be numbers");
            }
            if (width <= 0 || height <= 0 || duration <= 0 || frameRate <= 0) {
                return this.error(id, "Width, height, duration and frameRate must be positive");
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var summary = this.buildCompStructureSummary(sourceComp);
            var targetComp = app.project.items.addComp(
                newCompName,
                Math.round(width),
                Math.round(height),
                sourceComp.pixelAspect,
                duration,
                frameRate
            );
            var createdMap = {};
            var warnings = [];
            var createdCount = 0;
            var i = 0;
            for (i = summary.layers.length - 1; i >= 0; i -= 1) {
                var sourceLayer = summary.layers[i];
                var newLayer = null;
                if (sourceLayer.type === "text") {
                    newLayer = targetComp.layers.addText("");
                } else if (sourceLayer.type === "solid") {
                    newLayer = targetComp.layers.addSolid([0.2, 0.2, 0.2], "BG", targetComp.width, targetComp.height, 1);
                } else if (sourceLayer.type === "null") {
                    newLayer = targetComp.layers.addNull();
                } else if (sourceLayer.type === "shape") {
                    newLayer = targetComp.layers.addShape();
                } else if (sourceLayer.type === "adjustment") {
                    newLayer = targetComp.layers.addSolid([0, 0, 0], "adj", targetComp.width, targetComp.height, 1);
                    newLayer.adjustmentLayer = true;
                } else {
                    warnings.push(
                        "Skipped layer " +
                            sourceLayer.index +
                            " (" +
                            sourceLayer.type +
                            "): unsupported type for skeleton clone"
                    );
                }
                if (newLayer) {
                    newLayer.name = sourceLayer.name;
                    try {
                        var sourceInPoint = Number(sourceLayer.inPoint);
                        var sourceOutPoint = Number(sourceLayer.outPoint);
                        if (isFinite(sourceInPoint)) {
                            if (sourceInPoint < 0) sourceInPoint = 0;
                            if (sourceInPoint > targetComp.duration) sourceInPoint = targetComp.duration;
                            newLayer.inPoint = sourceInPoint;
                        }
                        if (isFinite(sourceOutPoint)) {
                            if (sourceOutPoint < 0) sourceOutPoint = 0;
                            if (sourceOutPoint > targetComp.duration) sourceOutPoint = targetComp.duration;
                            if (sourceOutPoint < newLayer.inPoint) sourceOutPoint = newLayer.inPoint;
                            newLayer.outPoint = sourceOutPoint;
                        }
                    } catch (timeError) {
                        warnings.push("Failed to set in/out point for layer " + sourceLayer.index);
                    }
                    createdMap[sourceLayer.index] = newLayer;
                    createdCount += 1;
                }
            }
            for (i = 0; i < summary.layers.length; i += 1) {
                var sourceNode = summary.layers[i];
                var targetLayer = createdMap[sourceNode.index];
                if (!targetLayer) continue;
                if (typeof sourceNode.parentIndex === "number") {
                    var parentLayer = createdMap[sourceNode.parentIndex];
                    if (parentLayer) {
                        targetLayer.parent = parentLayer;
                    } else {
                        warnings.push(
                            "Skipped parent for layer " +
                                sourceNode.index +
                                ": parent layer " +
                                sourceNode.parentIndex +
                                " was not cloned"
                        );
                    }
                }
            }
            return this.success(id, {
                newCompName: newCompName,
                layersCreated: createdCount,
                warnings: warnings
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    setLayerParent: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var layerIndex = payload && typeof payload.layerIndex !== "undefined" ? Number(payload.layerIndex) : 0;
            var parentIndex = payload ? payload.parentIndex : null;
            if (!compName || !isFinite(layerIndex) || layerIndex < 1) {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            if (layerIndex > comp.numLayers) {
                return this.error(id, "Layer index out of range: " + layerIndex);
            }
            var layer = comp.layer(layerIndex);
            var targetParent = null;
            if (parentIndex !== null && typeof parentIndex !== "undefined" && Number(parentIndex) !== 0) {
                parentIndex = Number(parentIndex);
                if (!isFinite(parentIndex) || parentIndex < 1 || parentIndex > comp.numLayers) {
                    return this.error(id, "Parent index out of range: " + parentIndex);
                }
                if (parentIndex === layerIndex) {
                    return this.error(id, "Layer cannot parent itself");
                }
                targetParent = comp.layer(parentIndex);
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            layer.parent = targetParent;
            return this.success(id, {
                layerName: layer.name,
                parentName: targetParent ? targetParent.name : null
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    createTextLayer: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var text = payload && typeof payload.text !== "undefined" ? String(payload.text) : "";
            var fontSize = payload && typeof payload.fontSize !== "undefined" ? Number(payload.fontSize) : 72;
            var color = payload && payload.color ? payload.color : [1, 1, 1];
            var position = payload && payload.position ? payload.position : null;
            if (!compName || !text) {
                return this.error(id, "Missing required payload fields");
            }
            if (!isFinite(fontSize) || fontSize <= 0) {
                return this.error(id, "fontSize must be a positive number");
            }
            if (!(color instanceof Array) || color.length !== 3) {
                return this.error(id, "color must be an RGB array");
            }
            var r = Number(color[0]);
            var g = Number(color[1]);
            var b = Number(color[2]);
            if (!isFinite(r) || !isFinite(g) || !isFinite(b)) {
                return this.error(id, "color channels must be numbers");
            }
            if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) {
                return this.error(id, "color channels must be in range 0-1");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            var x = comp.width / 2;
            var y = comp.height / 2;
            if (position !== null && typeof position !== "undefined") {
                if (!(position instanceof Array) || position.length !== 2) {
                    return this.error(id, "position must be [x, y]");
                }
                x = Number(position[0]);
                y = Number(position[1]);
                if (!isFinite(x) || !isFinite(y)) {
                    return this.error(id, "position values must be numbers");
                }
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var layer = comp.layers.addText(text);
            var textGroup = this.findPropertyByMatchName(layer, "ADBE Text Properties");
            if (!textGroup) {
                return this.error(id, "Text properties not found");
            }
            var textDocumentProp = this.findPropertyByMatchName(textGroup, "ADBE Text Document");
            if (!textDocumentProp) {
                return this.error(id, "Text document property not found");
            }
            var doc = textDocumentProp.value;
            doc.fontSize = fontSize;
            doc.fillColor = [r, g, b];
            textDocumentProp.setValue(doc);
            var transformGroup = this.findPropertyByMatchName(layer, "ADBE Transform Group");
            if (!transformGroup) {
                return this.error(id, "Transform group not found");
            }
            var positionProp = this.findPropertyByMatchName(transformGroup, "ADBE Position");
            if (!positionProp) {
                return this.error(id, "Position property not found");
            }
            positionProp.setValue([x, y]);
            return this.success(id, {
                layerIndex: layer.index,
                layerName: layer.name
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    batchRenameLayers: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var targetIndices = payload && payload.targetIndices ? payload.targetIndices : null;
            var prefix = payload && payload.prefix ? String(payload.prefix) : "";
            var suffix = payload && payload.suffix ? String(payload.suffix) : "";
            var findText = payload && payload.findText ? String(payload.findText) : "";
            var replaceText = payload && payload.replaceText ? String(payload.replaceText) : "";
            if (!compName) {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            var indices = [];
            var i = 0;
            if (targetIndices instanceof Array && targetIndices.length > 0) {
                for (i = 0; i < targetIndices.length; i += 1) {
                    var idx = Number(targetIndices[i]);
                    if (!isFinite(idx) || idx < 1 || idx > comp.numLayers) {
                        return this.error(id, "Layer index out of range: " + targetIndices[i]);
                    }
                    indices.push(Math.round(idx));
                }
            } else {
                for (i = 1; i <= comp.numLayers; i += 1) {
                    indices.push(i);
                }
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var renames = [];
            for (i = 0; i < indices.length; i += 1) {
                var layerIndex = indices[i];
                var layer = comp.layer(layerIndex);
                var oldName = String(layer.name);
                var newName = oldName;
                if (findText !== "") {
                    newName = newName.split(findText).join(replaceText);
                }
                newName = prefix + newName + suffix;
                layer.name = newName;
                renames.push({
                    index: layerIndex,
                    oldName: oldName,
                    newName: newName
                });
            }
            return this.success(id, {
                renamedCount: renames.length,
                renames: renames
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    addEffect: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var layerIndex = payload && typeof payload.layerIndex !== "undefined" ? Number(payload.layerIndex) : 0;
            var effectMatchName = payload && payload.effectMatchName ? String(payload.effectMatchName) : "";
            var effectName = payload && typeof payload.effectName !== "undefined" ? String(payload.effectName) : "";
            if (!compName || !isFinite(layerIndex) || layerIndex < 1 || !effectMatchName) {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            if (layerIndex > comp.numLayers) {
                return this.error(id, "Layer index out of range: " + layerIndex);
            }
            var layer = comp.layer(layerIndex);
            var effectsGroup = this.findPropertyByMatchName(layer, "ADBE Effect Parade");
            if (!effectsGroup) {
                return this.error(id, "Effects group not found");
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var effect = effectsGroup.addProperty(effectMatchName);
            if (!effect) {
                return this.error(id, "Failed to add effect: " + effectMatchName);
            }
            if (effectName) {
                effect.name = effectName;
            }
            return this.success(id, {
                effectIndex: effect.propertyIndex,
                effectName: effect.name
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    addKeyframesBatch: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var layerIndex = payload && typeof payload.layerIndex !== "undefined" ? Number(payload.layerIndex) : 0;
            var propertyMatchName = payload && payload.propertyMatchName ? String(payload.propertyMatchName) : "";
            var keyframes = payload && payload.keyframes ? payload.keyframes : null;
            var easing = payload && payload.easing ? String(payload.easing) : "linear";
            if (!compName || !isFinite(layerIndex) || layerIndex < 1 || !propertyMatchName || !(keyframes instanceof Array) || keyframes.length < 1) {
                return this.error(id, "Missing required payload fields");
            }
            if (easing !== "linear" && easing !== "ease" && easing !== "ease_in" && easing !== "ease_out") {
                return this.error(id, "Unsupported easing value");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            if (layerIndex > comp.numLayers) {
                return this.error(id, "Layer index out of range: " + layerIndex);
            }
            var layer = comp.layer(layerIndex);
            var prop = this.findPropertyByMatchName(layer, propertyMatchName);
            if (!prop) {
                return this.error(id, "Property not found by matchName: " + propertyMatchName);
            }
            if (typeof prop.setValueAtTime === "undefined") {
                return this.error(id, "Property cannot set keyframes: " + propertyMatchName);
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var i = 0;
            for (i = 0; i < keyframes.length; i += 1) {
                var keyframe = keyframes[i];
                var time = keyframe && typeof keyframe.time !== "undefined" ? Number(keyframe.time) : NaN;
                if (!isFinite(time)) {
                    return this.error(id, "Invalid keyframe time at index: " + i);
                }
                var convertedValue = this.convertPropertyValueByType(prop, keyframe ? keyframe.value : null);
                prop.setValueAtTime(time, convertedValue);
                if (easing !== "linear") {
                    var keyIndex = prop.nearestKeyIndex(time);
                    var easeInInfluence = easing === "ease_in" ? 66 : 33;
                    var easeOutInfluence = easing === "ease_out" ? 66 : 33;
                    var easeIn = new KeyframeEase(0, easeInInfluence);
                    var easeOut = new KeyframeEase(0, easeOutInfluence);
                    var isSpatial =
                        prop.propertyValueType == PropertyValueType.TwoD_SPATIAL ||
                        prop.propertyValueType == PropertyValueType.ThreeD_SPATIAL;
                    var inArray;
                    var outArray;
                    if (isSpatial) {
                        inArray = [easeIn];
                        outArray = [easeOut];
                    } else if (prop.propertyValueType == PropertyValueType.TwoD) {
                        inArray = [easeIn, easeIn];
                        outArray = [easeOut, easeOut];
                    } else if (prop.propertyValueType == PropertyValueType.ThreeD) {
                        inArray = [easeIn, easeIn, easeIn];
                        outArray = [easeOut, easeOut, easeOut];
                    } else {
                        inArray = [easeIn];
                        outArray = [easeOut];
                    }
                    prop.setTemporalEaseAtKey(keyIndex, inArray, outArray);
                }
            }
            return this.success(id, {
                keyframesAdded: keyframes.length
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    precomposeLayers: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var layerIndices = payload && payload.layerIndices ? payload.layerIndices : null;
            var newCompName = payload && payload.newCompName ? String(payload.newCompName) : "";
            var moveAllAttributes = payload && typeof payload.moveAllAttributes !== "undefined" ? !!payload.moveAllAttributes : true;
            if (!compName || !(layerIndices instanceof Array) || layerIndices.length < 1 || !newCompName) {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            var precomposeIndices = [];
            var i = 0;
            for (i = 0; i < layerIndices.length; i += 1) {
                var oneBased = Number(layerIndices[i]);
                if (!isFinite(oneBased) || oneBased < 1 || oneBased > comp.numLayers) {
                    return this.error(id, "Layer index out of range: " + layerIndices[i]);
                }
                precomposeIndices.push(Math.round(oneBased));
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var precomposeResult = comp.layers.precompose(precomposeIndices, newCompName, moveAllAttributes);
            var newLayerIndex = 0;
            if (precomposeResult && typeof precomposeResult.index === "number") {
                newLayerIndex = precomposeResult.index;
            } else {
                for (i = 1; i <= comp.numLayers; i += 1) {
                    var candidate = comp.layer(i);
                    if (candidate && candidate.source && precomposeResult && candidate.source === precomposeResult) {
                        newLayerIndex = candidate.index;
                        break;
                    }
                }
                if (!newLayerIndex) {
                    for (i = 1; i <= comp.numLayers; i += 1) {
                        var byName = comp.layer(i);
                        if (byName && byName.name === newCompName) {
                            newLayerIndex = byName.index;
                            break;
                        }
                    }
                }
            }
            return this.success(id, {
                newCompName: newCompName,
                newLayerIndex: newLayerIndex
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    createComposition: function (id, payload) {
        var hasUndo = false;
        try {
            var name = payload && payload.name ? String(payload.name) : "";
            var width = payload && typeof payload.width !== "undefined" ? Number(payload.width) : 0;
            var height = payload && typeof payload.height !== "undefined" ? Number(payload.height) : 0;
            var frameRate = payload && typeof payload.frameRate !== "undefined" ? Number(payload.frameRate) : 0;
            var duration = payload && typeof payload.duration !== "undefined" ? Number(payload.duration) : 0;
            var pixelAspect = payload && typeof payload.pixelAspect !== "undefined" ? Number(payload.pixelAspect) : 1;
            if (!name || !isFinite(width) || !isFinite(height) || !isFinite(frameRate) || !isFinite(duration) || !isFinite(pixelAspect)) {
                return this.error(id, "Missing required payload fields");
            }
            if (width <= 0 || height <= 0 || frameRate <= 0 || duration <= 0 || pixelAspect <= 0) {
                return this.error(id, "width, height, frameRate, duration and pixelAspect must be positive");
            }
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            var comp = app.project.items.addComp(name, Math.round(width), Math.round(height), pixelAspect, duration, frameRate);
            return this.success(id, {
                compName: comp.name,
                itemId: this.getCompId(comp)
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    setPropertyValue: function (id, payload) {
        var hasUndo = false;
        try {
            var compName = payload && payload.compName ? String(payload.compName) : "";
            var layerIndex = payload && typeof payload.layerIndex !== "undefined" ? Number(payload.layerIndex) : 0;
            var propertyMatchName = payload && payload.propertyMatchName ? String(payload.propertyMatchName) : "";
            var value = payload ? payload.value : null;
            if (!compName || !isFinite(layerIndex) || layerIndex < 1 || !propertyMatchName || typeof value === "undefined") {
                return this.error(id, "Missing required payload fields");
            }
            var comp = this.findCompByName(compName);
            if (!comp) {
                return this.error(id, "Composition not found: " + compName);
            }
            if (layerIndex > comp.numLayers) {
                return this.error(id, "Layer index out of range: " + layerIndex);
            }
            var layer = comp.layer(layerIndex);
            var prop = this.findPropertyByMatchName(layer, propertyMatchName);
            if (!prop) {
                return this.error(id, "Property not found by matchName: " + propertyMatchName);
            }
            if (typeof prop.expression !== "undefined" && String(prop.expression) !== "") {
                return this.error(id, "属性有表达式，请先移除表达式");
            }
            var convertedValue = this.convertPropertyValueByType(prop, value);
            app.beginUndoGroup("Agent Action");
            hasUndo = true;
            prop.setValue(convertedValue);
            return this.success(id, {
                propertyMatchName: propertyMatchName,
                valueSet: convertedValue
            });
        } catch (e) {
            return this.error(id, e.toString(), e.line);
        } finally {
            if (hasUndo) {
                try {
                    app.endUndoGroup();
                } catch (innerError) {}
            }
        }
    },

    toNumberArray: function (value, expectedLength, fieldName) {
        var arrayValue = null;
        var i = 0;
        if (!(value instanceof Array)) {
            throw new Error(fieldName + " must be an array");
        }
        if (value.length < expectedLength) {
            throw new Error(fieldName + " length must be " + expectedLength);
        }
        arrayValue = [];
        for (i = 0; i < expectedLength; i += 1) {
            var n = Number(value[i]);
            if (!isFinite(n)) {
                throw new Error(fieldName + " contains non-number value");
            }
            arrayValue.push(n);
        }
        return arrayValue;
    },

    convertPropertyValueByType: function (prop, value) {
        var valueType = prop.propertyValueType;
        if (valueType === PropertyValueType.OneD) {
            var n = Number(value);
            if (!isFinite(n)) {
                throw new Error("Value must be a number for ONE_D property");
            }
            return n;
        }
        if (valueType === PropertyValueType.TwoD || valueType === PropertyValueType.TwoD_SPATIAL) {
            return this.toNumberArray(value, 2, "value");
        }
        if (valueType === PropertyValueType.ThreeD || valueType === PropertyValueType.ThreeD_SPATIAL) {
            return this.toNumberArray(value, 3, "value");
        }
        if (valueType === PropertyValueType.COLOR) {
            var color = this.toNumberArray(value, 3, "value");
            if (color[0] < 0 || color[0] > 1 || color[1] < 0 || color[1] > 1 || color[2] < 0 || color[2] > 1) {
                throw new Error("Color channels must be in range 0-1");
            }
            return color;
        }
        throw new Error("不支持的属性类型（" + valueType + "），请使用支持数值输入的属性");
    },

    propertyEaseDimensions: function (prop, value) {
        var valueType = prop.propertyValueType;
        if (valueType === 1) return 1;
        if (valueType === 2 || valueType === 3) return 2;
        if (valueType === 4 || valueType === 5 || valueType === 6) return 3;
        if (value instanceof Array) return value.length > 0 ? value.length : 1;
        return 1;
    },

    buildCompStructureSummary: function (comp) {
        var layers = [];
        var namingMap = {};
        var expressionMap = {};
        var hasNullControllers = false;
        var hasPrimaryParenting = false;
        var i = 0;
        for (i = 1; i <= comp.numLayers; i += 1) {
            var layer = comp.layer(i);
            var layerType = this.getCompStructureLayerType(layer);
            if (layerType === "null") {
                hasNullControllers = true;
            }
            if (layer.parent) {
                hasPrimaryParenting = true;
            }
            var expressionInfo = this.collectLayerExpressionInfo(layer);
            var expressionKeys = expressionInfo.keys;
            var k = 0;
            for (k = 0; k < expressionKeys.length; k += 1) {
                expressionMap[expressionKeys[k]] = true;
            }
            var namingGroup = this.extractNamingGroup(layer.name);
            if (namingGroup) {
                namingMap[namingGroup] = true;
            }
            layers.push({
                index: layer.index,
                name: layer.name,
                type: layerType,
                hasExpression: expressionInfo.hasExpression,
                expressionSummary: expressionInfo.summary,
                parentIndex: layer.parent ? layer.parent.index : null,
                inPoint: layer.inPoint,
                outPoint: layer.outPoint
            });
        }
        return {
            compName: comp.name,
            frameRate: comp.frameRate,
            duration: comp.duration,
            width: comp.width,
            height: comp.height,
            layerCount: comp.numLayers,
            layers: layers,
            patterns: {
                namingGroups: this.objectKeys(namingMap),
                expressionsUsed: this.objectKeys(expressionMap),
                hasNullControllers: hasNullControllers,
                hasPrimaryParenting: hasPrimaryParenting
            }
        };
    },

    getCompStructureLayerType: function (layer) {
        if (layer instanceof TextLayer) return "text";
        if (layer instanceof ShapeLayer) return "shape";
        if (layer.nullLayer) return "null";
        if (layer.adjustmentLayer) return "adjustment";
        if (layer instanceof CameraLayer) return "camera";
        if (layer instanceof LightLayer) return "light";
        if (layer.source && layer.source instanceof CompItem) return "precomp";
        if (layer.source && layer.source instanceof SolidSource) return "solid";
        if (layer.source) return "footage";
        return "other";
    },

    collectLayerExpressionInfo: function (layer) {
        var info = {
            hasExpression: false,
            summary: "",
            usedMap: {}
        };
        this.scanExpressionProperties(layer, info);
        return {
            hasExpression: info.hasExpression,
            summary: info.summary,
            keys: this.objectKeys(info.usedMap)
        };
    },

    scanExpressionProperties: function (group, info) {
        var i = 0;
        if (!group) return;
        if (group instanceof Property) {
            var expressionText = typeof group.expression !== "undefined" ? String(group.expression) : "";
            var expressionEnabled = !!group.expressionEnabled;
            if (expressionEnabled && expressionText !== "") {
                info.hasExpression = true;
                this.collectExpressionKeywords(expressionText, info.usedMap);
                if (!info.summary) {
                    info.summary = this.expressionSummaryLabel(expressionText) + " on " + this.safeMatchName(group);
                }
            }
        }
        if (typeof group.numProperties === "undefined" || group.numProperties < 1) {
            return;
        }
        for (i = 1; i <= group.numProperties; i += 1) {
            this.scanExpressionProperties(group.property(i), info);
        }
    },

    expressionSummaryLabel: function (expressionText) {
        var lower = String(expressionText).toLowerCase();
        if (lower.indexOf("wiggle(") >= 0) return "wiggle";
        if (lower.indexOf("loopout(") >= 0) return "loopOut";
        if (lower.indexOf("loopin(") >= 0) return "loopIn";
        if (lower.indexOf("velocityattime(") >= 0) return "velocityAtTime";
        if (lower.indexOf("valueattime(") >= 0) return "valueAtTime";
        return "expression";
    },

    collectExpressionKeywords: function (expressionText, outMap) {
        var lower = String(expressionText).toLowerCase();
        var regex = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
        var match = null;
        while (true) {
            match = regex.exec(expressionText);
            if (!match) break;
            outMap[String(match[1])] = true;
        }
        if (lower.indexOf("loopout(") >= 0) outMap.loopOut = true;
        if (lower.indexOf("loopin(") >= 0) outMap.loopIn = true;
    },

    extractNamingGroup: function (name) {
        var text = String(name);
        var underscoreIndex = text.indexOf("_");
        var i = 0;
        if (underscoreIndex > 0) {
            return text.substring(0, underscoreIndex) + "_*";
        }
        for (i = 1; i < text.length; i += 1) {
            var current = text.charAt(i);
            var previous = text.charAt(i - 1);
            var isUpper = current >= "A" && current <= "Z";
            var prevIsLower = previous >= "a" && previous <= "z";
            if (isUpper && prevIsLower) {
                return text.substring(0, i) + "*";
            }
        }
        return "";
    },

    safeMatchName: function (prop) {
        if (prop && prop.matchName) {
            return String(prop.matchName);
        }
        return "property";
    },

    objectKeys: function (obj) {
        var keys = [];
        var key = "";
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    },

    getCompId: function (comp) {
        if (typeof comp.id !== "undefined") return comp.id;
        if (typeof comp.itemID !== "undefined") return comp.itemID;
        return 0;
    },

    normalizeLayerDetail: function (detail) {
        var value = detail ? String(detail) : "basic";
        if (
            value !== "basic" &&
            value !== "timing" &&
            value !== "with-effects" &&
            value !== "with-expressions" &&
            value !== "full"
        ) {
            throw new Error("Unsupported detail value: " + value);
        }
        return value;
    },

    buildLayerInfo: function (layer, detail, includeEffectProps) {
        var info = {
            index: layer.index,
            name: layer.name,
            type: this.getLayerType(layer),
            isPrecomp: this.isPrecompLayer(layer),
            parentIndex: layer.parent ? layer.parent.index : 0,
            enabled: !!layer.enabled,
            solo: !!layer.solo
        };
        if (detail === "timing" || detail === "full") {
            info.inPoint = layer.inPoint;
            info.outPoint = layer.outPoint;
            info.startTime = layer.startTime;
        }
        if (detail === "with-effects" || detail === "full") {
            info.effects = this.collectLayerEffects(layer, includeEffectProps);
        }
        if (detail === "with-expressions" || detail === "full") {
            info.expressionProperties = this.collectLayerExpressionProperties(layer);
        }
        return info;
    },

    collectLayerEffects: function (layer, includeProps) {
        var effects = [];
        var effectsGroup = this.findPropertyByMatchName(layer, "ADBE Effect Parade");
        var i = 0;
        if (!effectsGroup || typeof effectsGroup.numProperties === "undefined") {
            return effects;
        }
        for (i = 1; i <= effectsGroup.numProperties; i += 1) {
            var effect = effectsGroup.property(i);
            if (!effect) continue;
            var effectInfo = {
                index: typeof effect.propertyIndex === "number" ? effect.propertyIndex : i,
                name: effect.name ? String(effect.name) : "",
                matchName: effect.matchName ? String(effect.matchName) : ""
            };
            if (includeProps) {
                effectInfo.props = this.collectEffectProperties(effect);
            }
            effects.push(effectInfo);
        }
        return effects;
    },

    collectEffectProperties: function (effect) {
        var props = [];
        var i = 0;
        if (!effect || typeof effect.numProperties === "undefined") {
            return props;
        }
        for (i = 1; i <= effect.numProperties; i += 1) {
            var prop = effect.property(i);
            if (!prop || typeof prop.value === "undefined") continue;
            props.push({
                name: prop.name ? String(prop.name) : "",
                matchName: prop.matchName ? String(prop.matchName) : "",
                value: prop.value
            });
        }
        return props;
    },

    collectLayerExpressionProperties: function (layer) {
        var result = [];
        this.scanLayerExpressionProperties(layer, result);
        return result;
    },

    scanLayerExpressionProperties: function (group, out) {
        var i = 0;
        if (!group) return;
        if (group instanceof Property) {
            var expressionText = typeof group.expression !== "undefined" ? String(group.expression) : "";
            var expressionEnabled = !!group.expressionEnabled;
            if (expressionEnabled && expressionText !== "") {
                out.push({
                    matchName: group.matchName ? String(group.matchName) : "",
                    name: group.name ? String(group.name) : "",
                    expression: expressionText
                });
            }
        }
        if (typeof group.numProperties === "undefined" || group.numProperties < 1) {
            return;
        }
        for (i = 1; i <= group.numProperties; i += 1) {
            this.scanLayerExpressionProperties(group.property(i), out);
        }
    },

    isPrecompLayer: function (layer) {
        return !!(layer && layer.source && layer.source instanceof CompItem);
    },

    getLayerType: function (layer) {
        if (layer.nullLayer) return "NullLayer";
        if (layer instanceof CameraLayer) return "CameraLayer";
        if (layer instanceof LightLayer) return "LightLayer";
        if (layer instanceof ShapeLayer) return "ShapeLayer";
        if (layer instanceof TextLayer) return "TextLayer";
        if (layer instanceof AVLayer) return "AVLayer";
        return "AVLayer";
    },

    pushLayerSelectedProperties: function (layer, out) {
        var props = layer.selectedProperties;
        var i = 0;
        for (i = 0; i < props.length; i += 1) {
            var prop = props[i];
            out.push({
                layerIndex: layer.index,
                matchName: prop.matchName ? prop.matchName : "",
                name: prop.name ? prop.name : ""
            });
        }
    },

    findCompByName: function (compName) {
        var project = app.project;
        var i = 0;
        if (!project) return null;
        if (!compName && project.activeItem && project.activeItem instanceof CompItem) {
            return project.activeItem;
        }
        for (i = 1; i <= project.numItems; i += 1) {
            var item = project.item(i);
            if (item instanceof CompItem && item.name === compName) {
                return item;
            }
        }
        return null;
    },

    findPropertyByMatchName: function (group, matchName) {
        var i = 0;
        if (!group) return null;
        if (group.matchName === matchName) {
            return group;
        }
        if (typeof group.numProperties === "undefined" || group.numProperties < 1) {
            return null;
        }
        for (i = 1; i <= group.numProperties; i += 1) {
            var child = group.property(i);
            if (!child) continue;
            if (child.matchName === matchName) {
                return child;
            }
            if (typeof child.numProperties !== "undefined" && child.numProperties > 0) {
                var found = this.findPropertyByMatchName(child, matchName);
                if (found) return found;
            }
        }
        return null;
    },

    escapeString: function (value) {
        var str = String(value);
        str = str.replace(/\\/g, "\\\\");
        str = str.replace(/"/g, '\\"');
        str = str.replace(/\r/g, "\\r");
        str = str.replace(/\n/g, "\\n");
        return str;
    },

    encodeValue: function (value) {
        var i = 0;
        if (value === null || typeof value === "undefined") return "null";
        if (typeof value === "string") return '"' + this.escapeString(value) + '"';
        if (typeof value === "number") {
            if (isFinite(value)) return String(value);
            return "null";
        }
        if (typeof value === "boolean") return value ? "true" : "false";
        if (value instanceof Array) {
            var arr = [];
            for (i = 0; i < value.length; i += 1) {
                arr.push(this.encodeValue(value[i]));
            }
            return "[" + arr.join(",") + "]";
        }
        var parts = [];
        for (var key in value) {
            if (!value.hasOwnProperty(key)) continue;
            parts.push('"' + this.escapeString(key) + '":' + this.encodeValue(value[key]));
        }
        return "{" + parts.join(",") + "}";
    },

    success: function (id, data) {
        return '{"id":"' + this.escapeString(id) + '","status":"success","data":' + this.encodeValue(data || {}) + '}';
    },

    error: function (id, message, line) {
        var linePart = "";
        if (typeof line === "number") {
            linePart = ',"line":' + line;
        }
        return '{"id":"' + this.escapeString(id) + '","status":"error","data":{},"error":{"message":"' + this.escapeString(message) + '"' + linePart + '}}';
    }
};
