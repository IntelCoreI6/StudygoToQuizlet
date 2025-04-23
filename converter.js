async function fetchStudygoData(url) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        return data;
    } catch (error) {
        console.error('Error fetching Studygo data:', error);
        return null;
    }
}

function convertToQuizletFormat(data) {
    // Assuming the data is in a specific format, you may need to adjust this
    const lines = data.split('\n');
    const quizletData = lines.map(line => {
        const [term, definition] = line.split(':');
        return `${term}\t${definition}`;
    }).join('\n');
    return quizletData;
}

document.getElementById('convert-button').addEventListener('click', async () => {
    const url = document.getElementById('studygo-url').value;
    const data = await fetchStudygoData(url);
    if (data) {
        const quizletData = convertToQuizletFormat(data);
        document.getElementById('converted-text').value = quizletData;
    } else {
        document.getElementById('converted-text').value = 'Error fetching data. Please check the URL and try again.';
    }
});
