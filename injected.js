function getContestId(){
    return $("img.toggle-favourite").attr("data-entityId");
}
function getProblemIndex(){
    return document.querySelector('input[name="submittedProblemIndex"]').value;
}
function getQuestionCode(){
    return `${getContestId()}${getProblemIndex()}`;
}

function updateSubmissions() {
    const contestId = getContestId();
    const problemIndex = getProblemIndex();
    document.getElementById("submissions-container").innerHTML = "Loading submissions ...";

    $.get(`/contest/${contestId}/my`, function (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const pageContent = doc.querySelector('#pageContent');
        if (!pageContent) return;
        pageContent.classList.remove("content-with-sidebar");
        pageContent.id = "submission-page-content";

        pageContent.querySelectorAll('.second-level-menu').forEach(el => el.remove());

        const tables = pageContent.querySelectorAll('.status-frame-datatable');
        tables.forEach(table => {
            const rows = Array.from(table.querySelectorAll('tbody tr:not(.first-row)'));
            rows.forEach(row => {
                const problemCell = row.querySelector('td[data-problemid]');
                const problemLinkText = problemCell?.querySelector('a')?.textContent.trim() || '';
                if (!problemLinkText.startsWith(problemIndex + " ")) {
                    row.remove();
                }
                const cells = row.querySelectorAll('td');
                if (cells.length > 3) {
                    cells[3].remove();
                    cells[2].remove();
                }
            });

            const firstRow = table.querySelector('tr.first-row');
            if (firstRow) {
                const ths = firstRow.querySelectorAll('th');
                if (ths[2]) ths[2].style.display = 'none'; //hides who column
                if (ths[3]) ths[3].style.display = 'none'; //hides problem column
            }
        });
        const container = document.getElementById("submissions-container");
        container.innerHTML = '';
        const scripts = pageContent.querySelectorAll('script');
        scripts.forEach(oldScript => oldScript.remove());
        container.appendChild(pageContent);

        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            container.appendChild(newScript);
        });
    });
}

function setupTutorial(questionCode) {
    const problemTutorial = document.createElement('div');
    problemTutorial.classList.add("problemTutorial");
    problemTutorial.setAttribute("problemcode", getQuestionCode());
    problemTutorial.innerHTML = "Tutorial is loading...";

    const tutorialTab = document.getElementById("cf-tab-tutorial");
    tutorialTab.appendChild(problemTutorial);
    Codeforces.setupTutorials("/data/problemTutorial");

    const contestMaterialsBox = Array.from(document.querySelectorAll(".roundbox.sidebox.sidebar-menu.borderTopRound"))
        .find(box => box.querySelector(".caption")?.textContent.includes("Contest materials"));

    if (contestMaterialsBox) {
        contestMaterialsBox.style.display = "inline-block";
        contestMaterialsBox.style.width = "250px";
        contestMaterialsBox.style.margin = "50px";
        if (tutorialTab) {
            tutorialTab.appendChild(contestMaterialsBox);
        }
    }

}

function getExample(type = "input"){
    const pre = document.querySelector(`.sample-test .${type} pre`);
    const lines = pre.querySelectorAll(".test-example-line");

    const rawText = pre.innerText;
    const lineCount = lines.length;

    const formattedText = Codeforces.filterClipboardText(rawText, lineCount);

    return formattedText;
}

function setupCustomInvocation() {
    const inputArea = document.getElementById("inputArea");
    const outputArea = document.getElementById("outputArea");

    inputArea.value = getExample("input");

    $(document).ready(function () {
        window.customTestSubmitId = 0;
        window.inprocessCustomTestSubmitId = false;

        function rescanForCustomTestSubmit() {
            if (window.customTestSubmitId > 0 && !window.inprocessCustomTestSubmitId) {
                window.inprocessCustomTestSubmitId = true;

                $.post("/data/customtest", { communityCode: "", action: "getVerdict", customTestSubmitId: window.customTestSubmitId }, function (response) {
                    window.inprocessCustomTestSubmitId = false;
                    if (response["verdict"] != null && response["verdict"] != undefined && response["customTestSubmitId"] == window.customTestSubmitId) {
                        var result = response["output"] + "\n=====\nUsed: " + response["stat"];
                        outputArea.value = result;
                        window.customTestSubmitId = 0;
                    }
                });
            }
        }

        function submitCustomTest() {
            var sourceCode = ace.edit("editor").getValue();
            var programTypeId = document.getElementById("languageSelect").value || 89;            ;

            const data = {
                csrf_token: Codeforces.getCsrfToken(),
                source: sourceCode,
                tabSize: 4,
                programTypeId: programTypeId,                
                input: inputArea.value,
                output: "",
                _tta: Codeforces.tta(),
                communityCode: "", 
                action: "submitSourceCode", 
                sourceCode: sourceCode
            };

            $.ajax({
                type: "POST",
                url: "/data/customtest",
                data: data,
                success: function (response) {
                    var invalid = false;
                    document.getElementById("io-error").style.display = "none";
                    for (var i in response) {
                        if (response.hasOwnProperty(i) && i.indexOf("error__") === 0) {
                            invalid = true;
                            document.getElementById("io-error").style.display = "";
                            document.getElementById("io-error").innerHTML = i + ": " + response[i];
                            break;
                        }
                    }
                    if (!invalid) {
                        window.customTestSubmitId = parseInt(response["customTestSubmitId"]);
                        window.inprocessCustomTestSubmitId = false;
                        outputArea.value = "Running...";
                    }
                }
            });
        }

        window.setInterval(rescanForCustomTestSubmit, 2500);

        document.getElementById("runButton").addEventListener("click", function () {
            submitCustomTest();
        });
        
        function submitSolution() {
            const sourceCode = ace.edit("editor").getValue();
            const problemIndex = getProblemIndex();
            const csrf_token = Codeforces.getCsrfToken();
            const ftaa = window._ftaa;
            const bfaa = window._bfaa;
            const contestId = getContestId();//from favourite button
            const programTypeId = document.getElementById("languageSelect").value || 89;
            
            document.getElementById("submitButton").innerText = "Submitting ..."
            document.getElementById("submitButton").disabled = true;

            fetch(`/contest/${contestId}/problem/${problemIndex}?csrf_token=${csrf_token}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    csrf_token: csrf_token,
                    ftaa: ftaa,
                    bfaa: bfaa,
                    action: "submitSolutionFormSubmitted",
                    contestId: contestId,
                    submittedProblemIndex: problemIndex,
                    programTypeId: programTypeId,
                    source: sourceCode,
                    tabSize: 4,
                    sourceFile: "",
                    _tta: Codeforces.tta()
                })
            })
            .then(response => {
                document.getElementById("io-error").style.display = "none";
                console.log(response)
                console.log(response.url)
                if (response.url === `https://codeforces.com/contest/${contestId}/my`) {
                    document.getElementsByClassName("button-up")[0].click();//scroll up
                    document.getElementById("submission-tab-button").click();
                    updateSubmissions();
                } else {
                    response.text().then((response) => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response, 'text/html');
                        const error = doc.querySelector(".error")?.outerHTML || "Unknown Error while submitting";
                        document.getElementById("io-error").style.display = "";
                        document.getElementById("io-error").innerHTML = error;
                    });
                }
                document.getElementById("submitButton").innerText = "Submit"
                document.getElementById("submitButton").disabled = false;
            })
            .catch(err => {
                console.error("❌ Submission failed:", err);
                const error = "Unknown Error while submitting. Refresh page and try again";
                document.getElementById("io-error").style.display = "";
                document.getElementById("io-error").innerHTML = error;

                document.getElementById("submitButton").innerText = "Submit"
                document.getElementById("submitButton").disabled = false;
            });
        }
        document.getElementById("submitButton").addEventListener("click", function () {
            submitSolution();
        });

    });

}

function setupIde() {
    const questionCode = getQuestionCode();

    const ide = document.createElement("div");
    ide.id = "ide";
    ide.innerHTML = `
    <div id="toolbar" style="display: flex; align-items: center; gap: 10px;">
        <div>
            <label for="languageSelect">Language:</label>
            <select id="languageSelect"></select>
        </div>
        <div style="margin-left: auto; display: flex; gap: 10px;">

            <button id="formatBtn" style="height: 40px">Format</button>
            <button id="resetBtn" style="height: 40px">Reset</button>

            <div style="display: inline-block; position: relative;">
                <button id="settingsBtn" style="height: 40px; text-wrap: nowrap;">⚙ Settings</button>
                <div id="settingsMenu" style="display:none; position:absolute; top:100%; right:0; background:#fff; border:1px solid #ccc; padding:10px; z-index:1000; min-width: 150px">
                    <label>Tab size: <input type="number" id="tabSize" min="1" max="8" value="4" style="width: 50px;"></label><br><br>
                    <label> Theme: 
                        <select id="ide-theme">
                            <optgroup label="Bright">
                                <option value="ace/theme/chrome">Chrome</option>
                                <option value="ace/theme/clouds">Clouds</option>
                                <option value="ace/theme/crimson_editor">Crimson Editor</option>
                                <option value="ace/theme/dawn">Dawn</option>
                                <option value="ace/theme/dreamweaver">Dreamweaver</option>
                                <option value="ace/theme/eclipse">Eclipse</option>
                                <option value="ace/theme/github_light_default">GitHub Light Default</option>
                                <option value="ace/theme/github">GitHub (Legacy)</option>
                                <option value="ace/theme/iplastic">IPlastic</option>
                                <option value="ace/theme/solarized_light">Solarized Light</option>
                                <option value="ace/theme/textmate">TextMate</option>
                                <option value="ace/theme/tomorrow">Tomorrow</option>
                                <option value="ace/theme/xcode">XCode</option>
                                <option value="ace/theme/kuroir">Kuroir</option>
                                <option value="ace/theme/katzenmilch">KatzenMilch</option>
                                <option value="ace/theme/sqlserver">SQL Server</option>
                                <option value="ace/theme/cloud_editor">CloudEditor</option>
                            </optgroup>
                            <optgroup label="Dark">
                                <option value="ace/theme/ambiance">Ambiance</option>
                                <option value="ace/theme/chaos">Chaos</option>
                                <option value="ace/theme/clouds_midnight">Clouds Midnight</option>
                                <option value="ace/theme/dracula">Dracula</option>
                                <option value="ace/theme/cobalt">Cobalt</option>
                                <option value="ace/theme/gruvbox">Gruvbox</option>
                                <option value="ace/theme/gob">Green on Black</option>
                                <option value="ace/theme/idle_fingers">idle Fingers</option>
                                <option value="ace/theme/kr_theme">krTheme</option>
                                <option value="ace/theme/merbivore">Merbivore</option>
                                <option value="ace/theme/merbivore_soft">Merbivore Soft</option>
                                <option value="ace/theme/mono_industrial">Mono Industrial</option>
                                <option value="ace/theme/monokai">Monokai</option>
                                <option value="ace/theme/nord_dark">Nord Dark</option>
                                <option value="ace/theme/one_dark">One Dark</option>
                                <option value="ace/theme/pastel_on_dark">Pastel on dark</option>
                                <option value="ace/theme/solarized_dark">Solarized Dark</option>
                                <option value="ace/theme/terminal">Terminal</option>
                                <option value="ace/theme/tomorrow_night">Tomorrow Night</option>
                                <option value="ace/theme/tomorrow_night_blue">Tomorrow Night Blue</option>
                                <option value="ace/theme/tomorrow_night_bright">Tomorrow Night Bright</option>
                                <option value="ace/theme/tomorrow_night_eighties">Tomorrow Night 80s</option>
                                <option value="ace/theme/twilight">Twilight</option>
                                <option value="ace/theme/vibrant_ink">Vibrant Ink</option>
                                <option value="ace/theme/github_dark">GitHub Dark</option>
                                <option value="ace/theme/cloud_editor_dark">CloudEditor Dark</option>
                            </optgroup>
                        </select>
                    </label><br><br>
                    <label><input type="checkbox" id="autocompletion" checked="true"> Autocompletion</label><br><br>
                    <label><input type="checkbox" id="softTabs"> Use Soft Tabs</label><br><br>
                    <button id="saveTemplateBtn" style="width: 100%;">Save as Template</button>
                </div>
            </div>
        </div>
    </div>

    <div id="editor">Loading...</div>
    
    <div id="io-wrapper" style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
        <div>
            <div style="flex: 1;">
                <label for="inputArea"><strong>Input</strong></label><br>
                <textarea id="inputArea" rows="10"></textarea>
            </div>
            <div style="flex: 1;">
                <label for="outputArea"><strong>Output</strong></label><br>
                <textarea id="outputArea" rows="10" readonly></textarea>
            </div>
        </div>

        <div>
            <span id="io-error" class="error small">&nbsp;</span><br>
            <span class="notice for__output small">(Output: First 255 bytes only)&nbsp;</span>
        </div>

        <div style="display: flex; justify-content: space-around; gap: 10px;">
            <button id="runButton" style="padding: 10px 20px; width: 150px">Run</button>

            <button id="submitButton" style="padding: 10px 20px; width: 150px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Submit
            </button>
        </div>
    </div>

    `;

    document.getElementById("body").appendChild(ide);
    
    document.querySelectorAll('script[id^="nocomb.ace-builds"]').forEach(script => script.remove());

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.42.0/ext-beautify.min.js";
    script.type = 'text/javascript';
    document.head.appendChild(script);

    ace.config.set("themePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.42.0/");

    const languageOrder = [
        43, 54, 89, 91, 65, 79, 96, 9, 28, 97, 32, 12, 87, 36, 83, 88,
        19, 3, 4, 51, 13, 6, 7, 31, 40, 41, 70, 67, 75, 20, 34, 55
    ];
    const languageMap = {
        43: { displayName: "GNU GCC C11 5.1.0", aceMode: "c", fileExtension: "c", boilerplateCode: `#include <stdio.h>\n\nint main() {\n    // your code here\n    return 0;\n}` },
        54: { displayName: "GNU G++17 7.3.0", aceMode: "c_cpp", fileExtension: "cpp", boilerplateCode: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your code here\n    return 0;\n}` },
        89: { displayName: "GNU G++20 13.2", aceMode: "c_cpp", fileExtension: "cpp", boilerplateCode: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your code here\n    return 0;\n}` },
        91: { displayName: "GNU G++23 14.2", aceMode: "c_cpp", fileExtension: "cpp", boilerplateCode: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your code here\n    return 0;\n}` },
        65: { displayName: "C# 8, .NET Core 3.1", aceMode: "csharp", fileExtension: "cs", boilerplateCode: `using System;\n\nclass Program {\n    static void Main() {\n        // your code here\n    }\n}` },
        79: { displayName: "C# 10, .NET SDK 6.0", aceMode: "csharp", fileExtension: "cs", boilerplateCode: `using System;\n\nclass Program {\n    static void Main() {\n        // your code here\n    }\n}` },
        96: { displayName: "C# 13, .NET SDK 9", aceMode: "csharp", fileExtension: "cs", boilerplateCode: `using System;\n\nclass Program {\n    static void Main() {\n        // your code here\n    }\n}` },
        9: { displayName: "C# Mono 6.8", aceMode: "csharp", fileExtension: "cs", boilerplateCode: `using System;\n\nclass Program {\n    static void Main() {\n        // your code here\n    }\n}` },
        28: { displayName: "D DMD32 v2.105.0", aceMode: "d", fileExtension: "d", boilerplateCode: `import std.stdio;\n\nvoid main() {\n    // your code here\n}` },
        97: { displayName: "F# 9, .NET SDK 9", aceMode: "fsharp", fileExtension: "fs", boilerplateCode: `open System\n\n[<EntryPoint>]\nlet main argv =\n    // your code here\n    0` },
        32: { displayName: "Go 1.22.2", aceMode: "golang", fileExtension: "go", boilerplateCode: `package main\n\nimport "fmt"\n\nfunc main() {\n    // your code here\n}` },
        12: { displayName: "Haskell GHC 8.10.1", aceMode: "haskell", fileExtension: "hs", boilerplateCode: `main :: IO ()\nmain = do\n    -- your code here\n    return ()` },
        87: { displayName: "Java 21 64bit", aceMode: "java", fileExtension: "java", boilerplateCode: `public class Main {\n    public static void main(String[] args) {\n        // your code here\n    }\n}` },
        36: { displayName: "Java 8 32bit", aceMode: "java", fileExtension: "java", boilerplateCode: `public class Main {\n    public static void main(String[] args) {\n        // your code here\n    }\n}` },
        83: { displayName: "Kotlin 1.7.20", aceMode: "kotlin", fileExtension: "kt", boilerplateCode: `fun main() {\n    // your code here\n}` },
        88: { displayName: "Kotlin 1.9.21", aceMode: "kotlin", fileExtension: "kt", boilerplateCode: `fun main() {\n    // your code here\n}` },
        19: { displayName: "OCaml 4.02.1", aceMode: "ocaml", fileExtension: "ml", boilerplateCode: `let () =\n  (* your code here *)\n  ()` },
        3: { displayName: "Delphi 7", aceMode: "pascal", fileExtension: "pas", boilerplateCode: `program Hello;\nbegin\n    // your code here\nend.` },
        4: { displayName: "Free Pascal 3.2.2", aceMode: "pascal", fileExtension: "pas", boilerplateCode: `program Hello;\nbegin\n    // your code here\nend.` },
        51: { displayName: "PascalABC.NET 3.8.3", aceMode: "pascal", fileExtension: "pas", boilerplateCode: `program Hello;\nbegin\n    // your code here\nend.` },
        13: { displayName: "Perl 5.20.1", aceMode: "perl", fileExtension: "pl", boilerplateCode: `#!/usr/bin/perl\nuse strict;\nuse warnings;\n\n# your code here` },
        6: { displayName: "PHP 8.1.7", aceMode: "php", fileExtension: "php", boilerplateCode: `<?php\n// your code here` },
        7: { displayName: "Python 2.7.18", aceMode: "python", fileExtension: "py", boilerplateCode: `# your code here\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()` },
        31: { displayName: "Python 3.13.2", aceMode: "python", fileExtension: "py", boilerplateCode: `# your code here\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()` },
        40: { displayName: "PyPy 2.7.13", aceMode: "python", fileExtension: "py", boilerplateCode: `# your code here\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()` },
        41: { displayName: "PyPy 3.6.9", aceMode: "python", fileExtension: "py", boilerplateCode: `# your code here\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()` },
        70: { displayName: "PyPy 3.10", aceMode: "python", fileExtension: "py", boilerplateCode: `# your code here\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()` },
        67: { displayName: "Ruby 3.2.2", aceMode: "ruby", fileExtension: "rb", boilerplateCode: `# your code here\ndef main\nend\n\nmain` },
        75: { displayName: "Rust 1.75.0", aceMode: "rust", fileExtension: "rs", boilerplateCode: `fn main() {\n    // your code here\n}` },
        20: { displayName: "Scala 2.12.8", aceMode: "scala", fileExtension: "scala", boilerplateCode: `object Main extends App {\n    // your code here\n}` },
        34: { displayName: "JavaScript V8 4.8.0", aceMode: "javascript", fileExtension: "js", boilerplateCode: `// your code here\nconsole.log("Hello, world!");` },
        55: { displayName: "Node.js 15.8.0", aceMode: "javascript", fileExtension: "js", boilerplateCode: `// your code here\nconsole.log("Hello, world!");` },
    };

    const editor = ace.edit("editor");
    editor.session.setTabSize(4);
    editor.session.setUseSoftTabs(true);
    editor.setOptions({
        fontSize: "14px",
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
    });

    const savedTheme = localStorage.getItem("ace-theme") || "ace/theme/monokai";
    document.getElementById("ide-theme").value = savedTheme;
    ace.edit("editor").setTheme(savedTheme);

    document.getElementById('ide-theme').addEventListener('change', function () {
        const selectedTheme = this.value;
        ace.edit("editor").setTheme(selectedTheme);
        localStorage.setItem("ace-theme", selectedTheme);
    });    

    const select = document.getElementById("languageSelect");
    for (const id of languageOrder) {
        const lang = languageMap[id];
        if (!lang) continue;
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = lang.displayName;
        select.appendChild(opt);
    }

    function saveTemplate(langId, template) {
        localStorage.setItem(`template_${langId}`, template);
    }

    function getTemplate(langId) {
        const fromStorage = localStorage.getItem(`template_${langId}`);
        if (fromStorage !== null)
            return fromStorage;

        const boilerplateCode = languageMap[langId].boilerplateCode;
        if (boilerplateCode)
            return boilerplateCode;

        return "";
    }

    function saveSolution(questionCode, langId, code) {
        localStorage.setItem('lastusedlang', langId);
        localStorage.setItem(`question_${questionCode}_lastusedlang`, langId);
        localStorage.setItem(`question_${questionCode}_${langId}`, code);
    }

    function getSolution(questionCode, langId) {
        const code = localStorage.getItem(`question_${questionCode}_${langId}`);
        return code;
    }

    //questionCode is optional
    function getLastUsedLanguage(questionCode) {
        if (questionCode) {
            const langId = localStorage.getItem(`question_${questionCode}_lastusedlang`);
            if (langId) return langId;
        }
        const langId = localStorage.getItem("lastusedlang") || "89";
        return langId;
    }

    function loadEditor(langId) {
        var code = getSolution(questionCode, langId) || "";
        if (!code) {
            code = getTemplate(langId);
        }
        const lang = languageMap[langId];
        editor.session.setMode("ace/mode/" + lang.aceMode);
        select.value = langId;
        editor.setValue(code, 1);
    }

    var initLangId = getLastUsedLanguage(questionCode);
    loadEditor(initLangId);

    select.addEventListener("change", () => {
        const langId = select.value;
        loadEditor(langId);
    });

    editor.session.on('change', () => {
        const currentLangId = select.value;
        saveSolution(questionCode, currentLangId, editor.getValue());
    });


    //format button
    document.getElementById("formatBtn").addEventListener("click", () => {
        const beautify = ace.require("ace/ext/beautify");
        beautify.beautify(editor.session);
    });

    //reset button
    document.getElementById("resetBtn").addEventListener("click", () => {
        const template = getTemplate(select.value);
        editor.setValue(template, -1);
    });

    //settings
    const settingsMenu = document.getElementById("settingsMenu");
    document.getElementById("settingsBtn").addEventListener("click", () => {
        settingsMenu.style.display = settingsMenu.style.display === "none" ? "block" : "none";
    });

    const tabSizeInput = document.getElementById("tabSize");
    const softTabsCheckbox = document.getElementById("softTabs");
    const autoCompletionCheckbox = document.getElementById("autocompletion");

    function applyEditorSettings() {
        editor.session.setTabSize(parseInt(tabSizeInput.value));
        editor.session.setUseSoftTabs(softTabsCheckbox.checked);
        editor.setOptions({
            enableBasicAutocompletion: autoCompletionCheckbox.checked,
            enableSnippets: autoCompletionCheckbox.checked,
            enableLiveAutocompletion: autoCompletionCheckbox.checked
        });
    }

    tabSizeInput.addEventListener("change", applyEditorSettings);
    softTabsCheckbox.addEventListener("change", applyEditorSettings);
    autoCompletionCheckbox.addEventListener("change", applyEditorSettings);

    //save template
    document.getElementById("saveTemplateBtn").addEventListener("click", () => {
        saveTemplate(select.value, editor.getValue());
    });

    ace.require("ace/ext/beautify");
}

function setupMainContainer() {
    const mainContainer = document.createElement("div");
    mainContainer.id = "cf-main-container";

    const leftPane = document.createElement("div");
    leftPane.id = "cf-left-pane";

    const resizer = document.createElement("div");
    resizer.id = "cf-resizer";

    setupIde();
    setupCustomInvocation();


    const rightPane = document.createElement("div");
    rightPane.id = "cf-right-pane";
    
    const problemInfoAndTimer = document.querySelector('#sidebar .roundbox.sidebox.borderTopRound');
    problemInfoAndTimer.style.width = "300px";
    problemInfoAndTimer.style.margin = "0 auto";
    problemInfoAndTimer.style.display = "block";
    rightPane.appendChild(problemInfoAndTimer);

    const ide = document.getElementById("ide");
    rightPane.appendChild(ide);

    const pageContent = document.getElementById('pageContent');
    const parentContainer = pageContent.parentElement;

    mainContainer.append(leftPane, resizer, rightPane);

    parentContainer.appendChild(mainContainer);

    //split screen resize logic
    let isDragging = false;
    resizer.addEventListener("mousedown", () => {
        isDragging = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const rect = mainContainer.getBoundingClientRect();
        const totalWidth = rect.width;
        const offsetX = e.clientX - rect.left;

        const minWidth = 445; //min space for left
        const maxLeft = totalWidth - minWidth; //min space for right pane

        const clampedX = Math.max(minWidth, Math.min(offsetX, maxLeft));

        const leftPercent = (clampedX / totalWidth) * 100;
        const rightPercent = 100 - leftPercent;

        leftPane.style.width = `calc(${leftPercent}% - 5px)`;
        rightPane.style.width = `calc(${rightPercent}% - 5px)`;
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "default";
            document.body.style.userSelect = "";
        }
    });

    //to switch between split screen and column
    function handleResponsiveLayout() {
        const rightPane = document.getElementById("cf-right-pane");
        const leftPane = document.getElementById("cf-left-pane");
        const tabCode = document.getElementById("cf-tab-code");
        const mainContainer = document.getElementById("cf-main-container");
        const resizer = document.getElementById("cf-resizer");
        const codeButton = document.getElementById("code-button");

        var isSplit = true;
        if (window.innerWidth <= 900) {
            isSplit = false;
            if(rightPane.parentElement != tabCode){
                tabCode.appendChild(rightPane);
                mainContainer.style.display = "";
                resizer.style.display = "none";
                codeButton.style.display = "";
                leftPane.style.width = "100%";
                rightPane.style.width = "100%";
            }
        } else {
            if(rightPane.parentNode != mainContainer){
                mainContainer.appendChild(rightPane);
                mainContainer.style.display = "flex";
                resizer.style.display = "";
                codeButton.style.display = "none";
                leftPane.style.width = "calc(60% - 5px)";
                rightPane.style.width = "calc(40% - 5px)";
            } else {
                //following cases happen usually only when making window smaller, also since minwidth for split is 900px 445 is good
                const leftWidth = parseFloat(getComputedStyle(leftPane).width);
                const rightWidth = parseFloat(getComputedStyle(rightPane).width);
                
                if (leftWidth < 445 || rightWidth < 445) {
                    leftPane.style.width = "calc(50% - 5px)";
                    rightPane.style.width = "calc(50% - 5px)";
                }
            }
        }

        //to switch from editor to statement on split
        const event = new CustomEvent('split-toggle', {
            detail: { isSplit }
        });
        window.dispatchEvent(event);
    }

    window.addEventListener("resize", handleResponsiveLayout);
    window.addEventListener("load", handleResponsiveLayout);
}

function setupLeftContainer() {
    const sidebar = document.querySelector('#sidebar');
    if (sidebar) sidebar.style.display = 'none';

    const menu = document.querySelector('.second-level-menu');
    if (menu) menu.style.display = 'none';

    const pageContent = document.getElementById('pageContent');
    if (pageContent) {
        pageContent.classList.remove('content-with-sidebar');
    }

    const tabContainer = document.createElement('div');
    tabContainer.id = 'cf-tab-container';
    tabContainer.innerHTML = `
    <div class="cf-tab-header", style="display: flex; justify-content: space-between;">
        <div>
            <button onclick="location.href='/contest/${getContestId()}'">← Go to Contest</button>
        </div>
        <div>
            <button data-tab="statement" class="active">Statement</button>
            <button data-tab="code" id="code-button" style="display:none;">Editor</button>
            <button data-tab="tutorial">Tutorial</button>
            <button data-tab="submissions" id="submission-tab-button">Submissions</button>
            <button onclick="window.open('/contest/${getContestId()}/standings', '_blank')" style="height: 29.6px">↗ Standings</button>
        </div>
    </div>
      <div class="cf-tab-content" id="cf-tab-statement"></div>
      <div class="cf-tab-content" id="cf-tab-code" style="display:none;"></div>
      <div class="cf-tab-content content" id="cf-tab-tutorial" style="text-align: center;display:none;">
      </div>
      <div class="cf-tab-content" id="cf-tab-submissions" style="display:none;">
        <a href="/contest/${getContestId()}/status">Views Others Submissions</a><br><br>
        <div id="submissions-container">
            Submissions loading ...
        </div>
      </div>
    `;

    const parentContainer = document.getElementById("cf-left-pane");
    parentContainer.appendChild(tabContainer);

    const statementTab = document.getElementById('cf-tab-statement');
    statementTab.appendChild(pageContent);

    updateSubmissions();
    setupTutorial();
    
    function showTab(tabId) {
        document.querySelectorAll('.cf-tab-content').forEach(div => div.style.display = 'none');
        document.getElementById('cf-tab-' + tabId).style.display = 'block';
        document.querySelectorAll('.cf-tab-header button').forEach(btn => btn.classList.remove('active'));        
        document.querySelector(`.cf-tab-header button[data-tab="${tabId}"]`).classList.add('active');
        history.replaceState(null, '', '#' + tabId);
    }

    document.querySelectorAll('.cf-tab-header button').forEach(button => {
        if(button.hasAttribute("data-tab"))
            button.addEventListener('click', () => {
                showTab(button.dataset.tab)
            });
    });

    window.addEventListener('split-toggle', function (e) {
        const isSplit = e.detail.isSplit;
        if (isSplit && location.hash?.substring(1) == 'code') {
            showTab('statement');
        }
    });

    const initialTab = location.hash?.substring(1) || 'statement';
    showTab(initialTab);
}

function fixViewsChangesNoti(){
    Codeforces.addMathJaxListener(function () {
        let $problem = $(`div[problemindex=${getProblemIndex()}]`);
        let uuid = $problem.attr("data-uuid");
        let statementText = convertStatementToText($problem.find(".ttypography").get(0));
        
        $problem.find(".diff-notifier").hide();//hide it initially
        Codeforces.putToStorageTtl(uuid, statementText, 6 * 60 * 60);
    });
}

(function () {
    fixViewsChangesNoti();

    setupMainContainer();

    setupLeftContainer();
})();