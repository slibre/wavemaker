/* TODO:
  * 1. License files
  * 2. How to handle upgrades that add new css
  * 3. Header/Emphasized Content Panels
  * 4. Dialog/Button panels
  * 5. Filter the theme list to only show themes created by THIS theme designer
  */

dojo.declare("WidgetThemerPage", wm.Page, {
    "preferredDevice": "desktop",
    defaultEditorProps: {
        _classes: {domNode: ["StudioEditor"]},
        width: "100%",
        captionSize: "120px",
        captionAlign: "left",
        margin: "0,0,0,15"
    },


    templateFileData: [
        {
            name: "Buttons",
            templateFile: "button",
            classList: [{dataValue: "wm.Button"},{dataValue: "wm.ToggleButton"}, {dataValue: "wm.PopupMenuButton"}]
        }
    ],

	styleEditors: {
	    "default": ["wm.Text", {}],
		"font-family": ["wm.SelectMenu", {restrictValues: false, dataField: "dataValue", displayField: "dataValue"}, {}, {
			binding: ["wm.Binding", {}, {}, {
				wire: ["wm.Wire", {targetProperty: "dataSet", source: "fontFaceVar"}]
			}]
		}],
		"font-size": ["wm.prop.SizeEditor", {allSizeTypes:true}],
		"color": ["wm.ColorPicker", {}],
		"font-weight": ["wm.SelectMenu", {options: "normal,bold"}],
		"border-radius":["wm.BorderRadiusEditor", {caption: "border-radius"}],
		"box-shadow":   ["wm.BoxShadowEditor", {caption: "box-shadow"}],
		"background": ["wm.BackgroundEditor", {caption: "background"}]
	},
    /* If the style name is not in the styleRules object, then check directly in the styleEditors object.
     * Example: "font-family" isn't here, so check for font-family in the stylesEditor.
     * This section of for rules that are more complicated
     */
    styleRules: {
        "background": "background",
        "background-color": "background",
        "background-image": "background",
        "background-position": "background",
        "background-repeat": "background",
        // should have filter here, but thats a screwy microsoft style.
        
        "border-radius": "border-radius",
        "-webkit-border-radius": "border-radius",
        "-moz-border-radius": "border-radius",        
        "-o-border-radius": "border-radius",
        "-ms-border-radius": "border-radius",
        "border-top-left-radius": "border-radius",
        "-webkit-border-top-left-radius": "border-radius",
        "-moz-border-top-left-radius": "border-radius",        
        "-o-border-top-left-radius": "border-radius",
        "-ms-border-top-left-radius": "border-radius",        
        "border-top-left-radius": "border-radius",
        "-webkit-border-top-right-radius": "border-radius",
        "-moz-border-top-right-radius": "border-radius",        
        "-o-border-top-right-radius": "border-radius",
        "-ms-border-top-right-radius": "border-radius", 
        "border-bottom-left-radius": "border-radius",
        "-webkit-border-bottom-left-radius": "border-radius",
        "-moz-border-bottom-left-radius": "border-radius",        
        "-o-border-bottom-left-radius": "border-radius",
        "-ms-border-bottom-left-radius": "border-radius", 
        "border-bottom-right-radius": "border-radius",
        "-webkit-border-bottom-right-radius": "border-radius",
        "-moz-border-bottom-right-radius": "border-radius",        
        "-o-border-bottom-right-radius": "border-radius",
        "-ms-border-bottom-right-radius": "border-radius", 
        
        "box-shadow": "box-shadow",
        "-webkit-box-shadow": "box-shadow",
        "-moz-box-shadow": "box-shadow",        
        "-o-box-shadow": "box-shadow",        
        "-ms-box-shadow": "box-shadow"
    },
    
    start: function() {
        this.connect(studio.project, "projectChanging", this, "onHide");
        this.templateListVar.setData(this.templateFileData);
        this.setupThemeList();
    },



    /* START SECTION: End of managing themes and theme selection */
    setupThemeList: function() {
        var data = this.owner.owner.themesListVar.getData();
        for (var i = 0; i < data.length; i++) {
            if (data[i].dataValue == "wm_notheme") {
                data.splice(i,1);
                break;
            }
        }
        this.themeListVar.setDataSet(data);
        this.themeSelect.setDataValue(studio.application.theme);
    },
    themeselectChange: function(inSender) {
        var currentTheme = inSender.getDataValue();
        if (!currentTheme) return;
        this.currentTheme = currentTheme;
        this.currentThemeName = currentTheme.replace(/^.*\./,"");
        this.widgetCssFiles = {};

        studio.beginWait("Loading Theme...");
        wm.onidle(this, function() {


            /* Step 1: enable/disable delete button; this could go anywhere in the process */
            this.themesPageDeleteBtn.setDisabled(this.currentTheme.match(/^wm\./));

            /* Step 2: Set the class of the demo panel to the new theme so the demo widgets will get the proper classpath */
            this.demoPanel.domNode.className = this.currentThemeName;

            /* Step 4: Find the path to the theme folder */
            var path = dojo.moduleUrl(this.currentTheme);

            /* Step 5: Load the theme.css file that we are going to edit */
            this.cssText =  dojo.xhrGet({url:path + "theme.css", sync:true, preventCache:true}).results[0];
            // TODO: this.fullOriginalMobileCss =  dojo.xhrGet({url:path + "mobile/theme.css", sync:true, preventCache:true}).results[0];



            /* Step 6: Load the Theme.js file, store it in this.themePrototype */
            this.themePrototype =  dojo.fromJson(dojo.xhrGet({url:path + "Theme.js", sync:true, preventCache:true}).results[0]);

            studio.application.setTheme(this.currentTheme, false, this.cssText || " ", this.themePrototype, true);
            this.onPrototypeChange();
            studio.application.cacheWidgets();
            this.setDirty(false);

            this.widgetGrid.deselectAll();
            this.widgetGrid.select(0);

            studio.endWait();
        });
    },
    addNewThemeClick: function() {
        app.prompt("Enter theme name", studio.project.projectName + "Theme", dojo.hitch(this, "addNewTheme"));
    },
    addNewTheme: function(inThemeName) {
        inThemeName = inThemeName.replace(/[^a-zA-Z0-9_]/g,"");

        /* TODO: Update this query once themeListVar stops being a StringData var */
        if (this.themeListVar.query({dataValue: inThemeName}).getCount()) {
            app.prompt(inThemeName + " is taken. Enter a different theme name", studio.project.projectName + "Theme", dojo.hitch(this, "addNewTheme"));
            return;
        }

        /* Step 1: Create the theme folder */
        /* TODO: Need to have default theme.css file, presumably a compiled version of all of the individual theme templates */
        studio.resourceManagerService.requestAsync("createFolder", ["/common/themes/" + inThemeName]).then(
            dojo.hitch(this, function() {
                return studio.resourceManagerService.requestAsync("writeFile", ["/common/themes/" + inThemeName + "/theme.css", ""]);
            })
        ).then(
            dojo.hitch(this, function() {
                return studio.resourceManagerService.requestAsync("writeFile", ["/common/themes/" + inThemeName + "/mtheme.css", ""]);
            })
        ).then(
            dojo.hitch(this, function() {
                return studio.resourceManagerService.requestAsync("writeFile", ["/common/themes/" + inThemeName + "/Theme.js", "{}"]);
            })
        );
    },
    deleteThemeClick: function() {
        app.confirm("Are you sure you want to delete the theme " + this.currentThemeName + "?", false, dojo.hitch(this, "deleteTheme"));
    },
    deleteTheme: function() {
        studio.resourceManagerService.requestAsync("deleteFile", ["/common/themes/test"]).then(
            dojo.hitch(this, function() {
                app.toastSuccess("Deleted");
                this.setupThemeList();
            })
        );
    },
    /* END SECTION: End of managing themes and theme selection */



    /* START SECTION: Edit the selected widget styles and properties */
    widgetGridSelect: function(inSender) {

        /* Step 1: Set the current widget data */
        this.currentWidgetName = inSender.selectedItem.getValue("name");
        this.currentWidgetTemplateFile = inSender.selectedItem.getValue("templateFile");
        var heading = "";
        var currentClassList = this.currentClassList = [];
        inSender.selectedItem.getValue("classList").forEach(function(inItem) {
            currentClassList.push(inItem.getValue("dataValue"));
        });
        this.editorPanelHeader.setCaption(currentClassList.join(", "));


        /* Step 2: Load the css file and the sample file and apply it to the demo panel */
        this.widgetCssFiles[this.currentWidgetTemplateFile] = wm.load(dojo.moduleUrl("common.themes." + this.currentThemeName) + this.currentWidgetTemplateFile + ".css?" + (Math.floor(Math.random(new Date().getTime()) * 1000000))) ||
                                    wm.load(dojo.moduleUrl("wm.studio.app.templates") + "widgetthemes/" + this.currentWidgetTemplateFile + ".css").replace(/\.wm_template/g, "." + this.currentThemeName);
        this.sampleWidgets =  dojo.fromJson(wm.load(dojo.moduleUrl("wm.studio.app.templates") + "widgetthemes/" + this.currentWidgetTemplateFile + ".widgets"));
        this.regenerateDemoPanel();

        /* Generate the editors */
        this.editorPanel.removeAllControls();
        this.generatePrototypeEditors(this.currentClassList);
        this.generateCssEditors(this.currentWidgetTemplateFile);
        this.editorPanel.reflow();
    },
    /* END SECTION: Edit the selected widget styles and properties */


    /* START SECTION: Edit the selected widget styles */
    generateCssEditors: function(filename) {
        this._generatingEditors = true;
        try {
            var parent = this.editorPanel;

            var lines = this.widgetCssFiles[this.currentWidgetTemplateFile].split(/\n/);
            var currentGroup = "";
            dojo.forEach(lines, function(l) {
                var groupName = this.getGroupNameFromLine(l);
                if (groupName) {
                    currentGroup = groupName;
                    var label = new wm.Label({ width: "100%", 
                                                height: "30px",
                                                margin: "10,0,0,0",
                                                caption: currentGroup, 
                                                _classes: {domNode: ["SubHeading"]}, 
                                                owner: this, 
                                                parent: parent});
                    this.currentEditorsHash = {};
                } else {
                    var styleObj = this.getStyleObjFromLine(l);
                    if (styleObj) {
                        this.generateCssEditor(styleObj.name, styleObj.value, parent, currentGroup);
                    }
                }
            }, this);
        } catch(e) {}
        delete this._generatingEditors;
    },
    generateCssEditor: function(styleName, styleValue, parent, styleGroup) {
        var styleEditorDef;
        var styleRule = this.styleRules[styleName];
        if (styleName == "filter" && styleValue.match(/Gradient/i)) {
            styleRule = this.styleRules.background;
        }
        var editorExists = false;
        if (styleRule) {
            styleEditorDef =  this.styleEditors[styleRule];
            editorExists = Boolean(this.currentEditorsHash[styleRule]);
        } else {
            styleEditorDef =  this.styleEditors[styleName];
        }
        if (editorExists) {
            var e = this.currentEditorsHash[styleRule];
            e.setPartialValue(styleName, styleValue);
        } else {
            if (!styleEditorDef) styleEditorDef = this.styleEditors["default"];
            if (styleEditorDef[0] == "wm.BackgroundEditor") {
                styleEditorDef[1].urlPlaceHolder = wm.dojoModuleToPath(this.currentTheme + ".images") + "/example.png";
            }
            var e = parent.createComponent("", styleEditorDef[0], 
                dojo.mixin(styleEditorDef[1], {
                    caption: styleEditorDef[1] && styleEditorDef[1].caption || styleName,
                    dataValue: styleValue,
                    owner: this,
                    parent: parent
                }, this.defaultEditorProps), styleEditorDef[2], styleEditorDef[3]);
            e.connect(e, "onchange", this, dojo.hitch(this, "onEditorChange", e, styleGroup, styleName));    
            this.currentEditorsHash[styleRule || styleName] = e;
        }
    },
    getStyleObjFromLine: function(inLine) {
        var values = inLine.match(/\s*(.*?)\:\s*(.*);/);
        if (values) {
            return {name: values[1], value: values[2]};
        }
    },
    getGroupNameFromLine: function(inLine) {
        var values = inLine.match(/\*\sGROUP\:\s*(.*)\*\//);
        if (values) return values[1];
    },
    onEditorChange: function(inEditor, inGroup, inStyleName, inDisplayValue, inDataValue) {
        if (this._generatingEditors) return;
        var foundGroup = false;
        var currentGroup = "";
        var lines = this.widgetCssFiles[this.currentWidgetTemplateFile].split(/\n/);
        var updateCssLineFired = false;
        var deleteRows = [];
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            var groupName = this.getGroupNameFromLine(l);
            if (groupName) {
                currentGroup = groupName;
            } else if (currentGroup == inGroup) {
                foundGroup = true;
                var styleObj = this.getStyleObjFromLine(l);
                if (styleObj) {
                    /* If its a complex editor (has updateCssLIne method) let it examine
                     * every style in the group and update it if it chooses to 
                     */
                    if (inEditor.updateCssLine) {                        
                        // value is sent in case of name "filter" and value "Gradient"
                        // as thats the only way to know that a filter is for background gradient
                        var altLine = inEditor.updateCssLine(styleObj.name, styleObj.value);
                        if (altLine) {
                            if (!updateCssLineFired) {
                                lines[i] = "\t" + altLine + (altLine.match(/;\s*$/) ? "" : ";");
                                updateCssLineFired = true;
                            } else {
                                lines[i] = "";
                                deleteRows.push(i);
                            }
                        } 
                    } 
                    
                    /* Basic editors only edit a single line; exit loop after
                     * making the change
                     */
                    else if (styleObj.name === inStyleName) {
                        lines[i] = "\t" + inStyleName + ": " + inDataValue + ";";
                        break;
                    }
                }
            } else if (foundGroup) {
                break;
            }
        }
        for (var i = deleteRows.length-1; i >= 0; i--) wm.Array.removeElementAt(lines,deleteRows[i]);
        this.widgetCssFiles[this.currentWidgetTemplateFile] = lines.join("\n");
        var startString = "/***** START SECTION: " + this.currentWidgetName + " *****/";
        var endString = "/***** END SECTION: " + this.currentWidgetName + " *****/";
        var startIndex = this.cssText.indexOf(startString);
        if (startIndex != -1) {
            startIndex += startString.length;
            var endIndex = this.cssText.indexOf(endString, startIndex);
            this.cssText =  this.cssText.substring(0,startIndex) + "\n" +
                            this.widgetCssFiles[this.currentWidgetTemplateFile] + "\n" +
                            this.cssText.substring(endIndex);
        } else {
            this.cssText += startString + "\n" + this.widgetCssFiles[this.currentWidgetTemplateFile] + "\n" + endString;
        }
        studio.application.loadThemeCss(studio.application.theme, true, this.cssText);
    },
    /* END SECTION: Edit the selected widget styles */

    /* START SECTION: Manage AceEditor */
    /* TODO: Support user editing this file, OR make it readonly */
    onCssLayerShow: function() {
        this.editArea.setDataValue(this.widgetCssFiles[this.currentWidgetTemplateFile]);
    },


    /* START SECTION: Edit the selected widget prototype */
    generatePrototypeEditors: function(currentClassList) {
        this.currentPrototypeProperties = {};
        dojo.forEach(currentClassList, dojo.hitch(this, "generatePrototypeEditorsForClass"));
    },
    generatePrototypeEditorsForClass: function(inClassName) {
        var ctor = dojo.getObject(inClassName);
        if (!ctor) return; /* TODO: Do we need to try to load the component? */

        /* Initialize the prototype data we're storing for this class if it doesn't already exist */
        if (!this.themePrototype[inClassName]) this.themePrototype[inClassName] = {};

        /* Get the editor props from the widget's design time file */
        var editableProps = [];
        if (ctor.prototype.themeableProps) {
            editableProps = dojo.clone(ctor.prototype.themeableProps);
            var tmp = [];
            dojo.forEach(editableProps, function(inPropName) {
                if (!this.currentPrototypeProperties[inPropName]) {
                    tmp.push(inPropName);
                    this.currentPrototypeProperties[inPropName] = true;
                }
            }, this);
            editableProps = tmp;
        }

        /* Generate an editor for each one */
        if (editableProps.length) {
            new wm.Label({name: "mainPanel1Label",
                  caption: "Default Properties for " + inClassName,
                  width: "100%",
                  height: "24px",
                  parent: this.editorPanel,
                  owner: this
            });
            dojo.forEach(editableProps, dojo.hitch(this, "generatePrototypeEditor", inClassName, ctor));
        }
    },
    generatePrototypeEditor: function(inClassName, ctor, p) {
        var props = dojo.mixin({
            caption: p,
            dataValue: this.themePrototype[inClassName][p] || ctor.prototype[p],
            owner: this,
            parent: this.editorPanel,
            name: p
        }, this.defaultEditorProps);
        var e;
        switch(p) {
        case "borderColor":
        case "clientBorderColor":
        case "labelBorderColor":
                    e = new wm.ColorPicker(props);
                    break;
        case "border":
        case "labelBorder":
        case "layerBorder":
                    props.regExp = "\\d+(\\s*,\\s*\\d+){0,3}";
                    e = new wm.Text(props);
                    break;
        case "isMajorContent":
                    e = new wm.Checkbox(props);
                    e.setChecked(props.dataValue);
                    break;
        default:
                    e = new wm.Text(props);
        }
        e.connect(e, "onchange", dojo.hitch(this, "onPrototypeEditorChange", p, e));
    },
    onPrototypeEditorChange: function( inPropName, editor, inDisplayValue, inDataValue) {
        studio._themeDesignerChange = true;
        studio._reflowPageDesigner = true;
        studio.application.cacheWidgets();
        this.setDirty(true);

        dojo.forEach(this.currentClassList, function(inClassName) {
            var ctor = dojo.getObject(inClassName);
            if (ctor.prototype.themeableProps && dojo.indexOf(ctor.prototype.themeableProps,inPropName) != -1) {

                studio.application.loadThemePrototypeForClass(ctor); // make sure the prototype is loaded before we start editting it
                ctor.prototype[inPropName] = inDataValue;
                this.themePrototype[inClassName][inPropName] = inDataValue;
            }
        }, this);
        this.regenerateDemoPanel();
        this.onPrototypeChange();
    },
    onPrototypeChange: function() {
        studio._themeDesignerChange = true;
        studio._reflowPageDesigner = true;
    },
    /* END SECTION: Edit the selected widget prototype */


    /* START SECTION: Saving */
    saveThemeClick: function() {
        var files = this._templateFilesToWrite = [];
        wm.forEachProperty(this.widgetCssFiles, function(inValue, inName) {
            files.push({fileName: inName, cssText: inValue});
        });
        studio.beginWait("Saving...");
        studio.resourceManagerService.requestAsync("writeFile", ["/common/themes/" + this.currentThemeName + "/theme.css", this.cssText]).then(
            dojo.hitch(this, function() {
                return studio.resourceManagerService.requestAsync("writeFile", ["/common/themes/" + this.currentThemeName + "/Theme.js", dojo.toJson(this.themePrototype, true)]);
            })
        ).then(dojo.hitch(this, "writeTemplateFiles"));
    },
    writeTemplateFiles: function() {
        if (this._templateFilesToWrite.length) {
            var fileObj = this._templateFilesToWrite.shift();
            var fileName = fileObj.fileName + ".css";
            var cssText = fileObj.cssText;
            studio.resourceManagerService.requestAsync("writeFile", ["/common/themes/" + this.currentThemeName + "/" + fileName, cssText]).then(dojo.hitch(this, "writeTemplateFiles"));
        } else {
            studio.endWait();
            app.toastSuccess("Saved");
        }

    },

    /* START SECTION: Managing the Demo Panel */
    onShow: function() {
        this.demoPanel.owner = studio.application;
    },
    onHide: function() {
        this.demoPanel.owner = this;
    },
    regenerateDemoPanel: function() {
        this.demoPanel.removeAllControls();
        this.demoPanel.createComponents(this.sampleWidgets);
        this.demoPanel.reflow();
    },
    /* END SECTION: Managing the Demo Panel */


    /* START SECTION: Studio Integration Methods */
    setDirty: function(dirty) {
        this.isDirty = dirty;
        wm.job("WidgetThemerPage.setDirty", 10, this, function() {
            var layer = this.owner.parent;
            if (dojo.hasClass(layer.decorator.btns[layer.getIndex()], "StudioDirtyIcon")) {
                if (!dirty) {
                dojo.removeClass(layer.decorator.btns[layer.getIndex()], "StudioDirtyIcon");
                studio.updateServicesDirtyTabIndicators();
                }
            } else if (dirty) {
                dojo.addClass(layer.decorator.btns[layer.getIndex()], "StudioDirtyIcon");
                studio.updateServicesDirtyTabIndicators();
            }
        });
    },
    getDirty: function() {
        return this.isDirty;
    },
    /* END SECTION: Studio Integration Methods */

    _end: 0
});