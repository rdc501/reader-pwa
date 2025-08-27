if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered! Scope:', registration.scope);
            })
            .catch(err => {
                console.log('Service Worker registration failed:', err);
            });
    });
}

const urlInput = document.getElementById('urlInput');
const loadingSpinner = document.getElementById('loadingSpinner');
const articleContainer = document.getElementById('articleContainer');
const articleTitle = document.getElementById('articleTitle');
const articleContent = document.getElementById('articleContent');
const savedArticlesList = document.getElementById('savedArticlesList');
const fileInput = document.getElementById('fileInput');
const listArticlesSpinner = document.getElementById('listArticlesSpinner'); // New spinner

let timeout = null;

// Tab switching logic
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(tabId).classList.add('active');
        button.classList.add('active');

        // Specific actions for each tab
        if (tabId === 'listArticles') {
            displaySavedArticles();
        } else if (tabId === 'viewArticle') {
            // Optionally hide articleContainer if nothing is selected to view
            // articleContainer.style.display = 'none';
        }
    });
});

// Initialize with the first tab active
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tab-button[data-tab="addArticle"]').click();
});

const saveArticle = (article) => {
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    const existingIndex = articles.findIndex(a => a.url === article.url);

    if (existingIndex !== -1) {
        // Update existing article
        articles[existingIndex] = { ...articles[existingIndex], ...article };
    } else {
        // Add new article, checking for duplicates by title or URL
        const exists = articles.some(a => a.url === article.url || a.title === article.title);
        if (!exists) {
            articles.push(article);
        }
    }
    localStorage.setItem('savedArticles', JSON.stringify(articles));
    // displaySavedArticles(); // This will be called when the List Articles tab is activated
};

const deleteArticle = (urlToDelete) => {
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    articles = articles.filter(article => article.url !== urlToDelete);
    localStorage.setItem('savedArticles', JSON.stringify(articles));
    displaySavedArticles();
    // Optionally, hide the article container if the deleted article was currently displayed
    if (articleTitle.dataset.url === urlToDelete) {
        articleContainer.style.display = 'none';
        articleTitle.textContent = '';
        articleContent.innerHTML = '';
    }
};

const displaySavedArticles = () => {
    savedArticlesList.innerHTML = ''; // Clear current list
    let articles = JSON.parse(localStorage.getItem('savedArticles')) || [];
    articles.forEach(article => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#'; // Or a specific link to view the saved article
        a.textContent = article.title;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            // Switch to viewArticle tab and display the article
            document.querySelector('.tab-button[data-tab="viewArticle"]').click();
            articleTitle.textContent = article.title;
            articleTitle.dataset.url = article.url; // Store URL for potential deletion handling
            articleContent.innerHTML = article.content;
            articleContainer.style.display = 'block';
        });
        li.appendChild(a);

        if (!article.downloaded) {
            const downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download';
            downloadButton.classList.add('download-button');
            downloadButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                await downloadArticle(article);
            });
            li.appendChild(downloadButton);
        }

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteArticle(article.url);
        });
        li.appendChild(deleteButton);

        const openButton = document.createElement('button');
        openButton.textContent = 'Open';
        openButton.classList.add('open-button');
        openButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(article.url, '_blank');
        });
        li.appendChild(openButton);

        savedArticlesList.appendChild(li);
    });
};

// Load saved articles on startup - now handled by tab switching
// document.addEventListener('DOMContentLoaded', displaySavedArticles);

const processUrl = async (existingArticle = null) => {
    const url = existingArticle ? existingArticle.url : urlInput.value;
    if (url) {
        loadingSpinner.style.display = 'block';
        listArticlesSpinner.style.display = 'block'; // Show listArticlesSpinner
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const html = data.contents;

            const doc = new DOMParser().parseFromString(html, 'text/html');
            let article = new Readability(doc).parse();

            if (article) {
                articleTitle.textContent = article.title;
                articleTitle.dataset.url = url; // Store URL
                articleContent.innerHTML = article.content;
                articleContainer.style.display = 'block';
                saveArticle({ ...existingArticle, title: article.title, content: article.content, url: url, downloaded: true });
            } else {
                articleTitle.style.display = 'none';
                articleContent.textContent = 'Failed to parse article content.';
            }
        } catch (error) {
            console.error('Error fetching or parsing the URL:', error);
            articleTitle.style.display = 'none';
            articleContent.textContent = 'Error fetching or parsing the URL.';
        } finally {
            loadingSpinner.style.display = 'none';
            listArticlesSpinner.style.display = 'none'; // Hide listArticlesSpinner
            // Switch to viewArticle tab after processing URL
            document.querySelector('.tab-button[data-tab="viewArticle"]').click();
        }
    } else {
        articleContainer.style.display = 'none';
        articleTitle.textContent = '';
        articleContent.innerHTML = '';
    }
};

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target.result;
            processFile(file.name, fileContent);
        };
        reader.readAsText(file);
    }
});

const processFile = (fileName, content) => {
    loadingSpinner.style.display = 'block';
    listArticlesSpinner.style.display = 'block'; // Show listArticlesSpinner
    try {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const articlesToSave = results.data
                    .filter(row => row.title && row.url)
                    .map(row => ({
                        title: row.title,
                        url: row.url,
                        downloaded: false
                    }));
                articlesToSave.forEach(article => saveArticle(article));
                // After processing file, switch to listArticles tab
                document.querySelector('.tab-button[data-tab="listArticles"]').click();
            }
        });
    } catch (error) {
        console.error('Error handling file:', error);
        articleTitle.textContent = 'Error handling file.';
        articleContainer.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
        listArticlesSpinner.style.display = 'none'; // Hide listArticlesSpinner
    }
};

urlInput.addEventListener('input', () => {
    clearTimeout(timeout);
    articleContainer.style.display = 'none';
    loadingSpinner.style.display = 'none';
    listArticlesSpinner.style.display = 'none'; // Hide listArticlesSpinner
    articleTitle.textContent = '';
    articleContent.innerHTML = '';

    timeout = setTimeout(processUrl, 2000);
});

urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        clearTimeout(timeout);
        processUrl();
    }
});

const clearAllArticles = () => {
    if (confirm('Are you sure you want to clear all saved articles? This action cannot be undone.')) {
        localStorage.removeItem('savedArticles');
        displaySavedArticles();
        // If on viewArticle tab and no articles, hide article container
        if (document.querySelector('.tab-button[data-tab="viewArticle"]').classList.contains('active')) {
            articleContainer.style.display = 'none';
            articleTitle.textContent = '';
            articleContent.innerHTML = '';
        }
    }
};

document.getElementById('clearArticlesButton').addEventListener('click', clearAllArticles);

const downloadArticle = async (articleToDownload) => {
    await processUrl(articleToDownload);
};
