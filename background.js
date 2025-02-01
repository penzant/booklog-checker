// Firefox では `browser` API を使用
if (typeof chrome === "undefined" && typeof browser !== "undefined") {
    var chrome = browser;
}

// 設定ファイル (config.json) を読み込む関数
async function fetchConfig() {
    try {
        let response = await fetch(chrome.runtime.getURL("config.json"));
        let config = await response.json();
        return config.API_ID;
    } catch (error) {
        console.error("config.json の読み込みに失敗しました:", error);
        return null;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("background.js: メッセージ受信", message);

    if (message && message.action === "sendISBNs" && Array.isArray(message.books)) {
        fetchConfig().then(API_ID => {
            if (!API_ID) {
                console.error("API_ID が取得できませんでした。");
                sendResponse({ results: [], error: "API_ID が取得できませんでした。" });
                return;
            }

            checkBooklog(API_ID, message.books).then(sendResponse);
        });

        return true;
    } else {
        console.error("background.js: 不正なメッセージ形式", message);
    }
});

async function checkBooklog(API_ID, bookList) {
    if (!API_ID) {
        console.error("checkBooklog: API_ID が未設定です");
        return { results: [] };
    }

    if (!Array.isArray(bookList) || bookList.length === 0) {
        console.error("checkBooklog: 空の bookList を受信しました!");
        return { results: [] };
    }

    console.log("checkBooklog: API_ID =", API_ID);
    const API_URL = `https://api.booklog.jp/v2/json/${API_ID}?count=10000`;

    try {
        let response = await fetch(API_URL);
        let data = await response.json();

        if (!data.books) {
            throw new Error("Booklog API のレスポンスに `books` が存在しません");
        }

        let bookISBNs = data.books.map(book => {
            let isbn10 = book.url.split("/").pop();
            return convertISBN10to13(isbn10);
        });

        let results = bookList.map(book => ({
            title: book.title,
            isbn: book.isbn,
            found: bookISBNs.includes(book.isbn)
        }));

        console.log("checkBooklog: 処理完了", results);
        return { results };
    } catch (error) {
        console.error("checkBooklog: Booklogデータの取得エラー", error);
        return { results: [], error: error.message };
    }
}

function convertISBN10to13(isbn10) {
    if (!isbn10 || isbn10.length !== 10) {
        return null;
    }

    let isbn13Base = "978" + isbn10.slice(0, 9);

    let sum = 0;
    for (let i = 0; i < isbn13Base.length; i++) {
        sum += parseInt(isbn13Base[i]) * (i % 2 === 0 ? 1 : 3);
    }
    let checkDigit = (10 - (sum % 10)) % 10;

    return isbn13Base + checkDigit;
}
