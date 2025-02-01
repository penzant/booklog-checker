function extractISBNsAndTitles() {
    let books = [];

    console.log("content.js: ISBN 取得開始");

    document.querySelectorAll(".ec-cartRow__summary").forEach(element => {
        let titleElement = element.querySelector(".ec-cartRow__name a b");
        let isbnElement = element.querySelector(".ec-cartRow__unitData b");

        if (titleElement && isbnElement && isbnElement.nextSibling) {
            let title = titleElement.textContent.trim();
            let isbnText = isbnElement.nextSibling.textContent.trim();
            if (/^\d{13}$/.test(isbnText)) {
                books.push({ title: title, isbn: isbnText });
                console.log(`取得したISBN: ${isbnText}, タイトル: ${title}`);
            }
        }
    });

    console.log("content.js: ISBN 取得完了", books);
    return books;
}
