const express = require('express');
const cors = require('cors');

const port = process.env.PORT || 5000;

const app = express();
app.use(cors())

app.get('/', (req, res, next) => {
    res.send('Workon Server is running....')
})
app.listen(port, () => {
    console.log(`Workon server is running on port ${port}`)
})