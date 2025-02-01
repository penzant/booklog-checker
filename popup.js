document.addEventListener("DOMContentLoaded", () => {
    const checkBtn = document.getElementById("checkISBNs");
    const downloadBtn = document.getElementById("downloadCSV");
    const resultsContainer = document.getElementById("results");

    checkBtn.addEventListener("click", () => {
        resultsContainer.textContent = "ISBNを取得中...";

        // アクティブなタブを取得
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                resultsContainer.textContent = "アクティブなタブが見つかりません。";
                return;
            }

            // `content.js` を現在のページに注入して実行
            chrome.tabs.executeScript(tabs[0].id, {
                file: "content.js"
            }, () => {
                if (chrome.runtime.lastError) {
                    resultsContainer.textContent = "スクリプトの実行に失敗しました。";
                    return;
                }

                // `content.js` 内で定義された `extractISBNsAndTitles()` を実行
                chrome.tabs.executeScript(tabs[0].id, {
                    code: "extractISBNsAndTitles();"
                }, (results) => {
                    if (chrome.runtime.lastError || !results || results.length === 0) {
                        resultsContainer.textContent = "ISBN の取得に失敗しました。";
                        return;
                    }

                    let books = results[0];
                    if (!books || books.length === 0) {
                        resultsContainer.textContent = "ISBN が見つかりませんでした。";
                        return;
                    }

                    console.log("popup.js: 取得したISBN", books);

                    // `background.js` に ISBN を送信し、チェックを依頼
                    chrome.runtime.sendMessage({ action: "sendISBNs", books: books }, (response) => {
                        console.log("popup.js: チェック結果", response);
                        resultsContainer.innerHTML = "";

                        if (response && response.results) {
                            let csvData = [["タイトル", "ISBN", "登録状況"]];
                            response.results.forEach(result => {
                                let div = document.createElement("div");
                                let statusText = result.found ? "✅ 登録済み" : "❌ 未登録";
                                div.textContent = `【${result.title}】 ISBN: ${result.isbn} - ${statusText}`;
                                div.style.color = result.found ? "green" : "red";
                                resultsContainer.appendChild(div);

                                csvData.push([result.title, result.isbn, result.found ? "登録済み" : "未登録"]);
                            });

                            // CSV ボタンを表示し、データをダウンロード可能にする
                            downloadBtn.style.display = "block";
                            downloadBtn.addEventListener("click", () => downloadCSV(csvData));
                        } else {
                            resultsContainer.textContent = "ISBN のチェックに失敗しました。";
                        }
                    });
                });
            });
        });
    });
});

function downloadCSV(csvArray) {
    let csvContent = "data:text/csv;charset=utf-8,"
        + csvArray.map(e => e.join(",")).join("\n");

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "booklog_isbn_check.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
