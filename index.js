const puppeteer = require('puppeteer')
const fs = require('fs')
const root = 'https://edisontd.nl'
const allCountries = require('./countries.json')

const main = async () => {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(root)
    const allChars = ['https://edisontd.nl/?char=0']
    // const allChars = ['https://edisontd.nl/?char=0', 'https://edisontd.nl/?char=1', 'https://edisontd.nl/?char=2', 'https://edisontd.nl/?char=3', 'https://edisontd.nl/?char=4', 'https://edisontd.nl/?char=5',
    //     'https://edisontd.nl/?char=6', 'https://edisontd.nl/?char=7', 'https://edisontd.nl/?char=8', 'https://edisontd.nl/?char=9', 'https://edisontd.nl/?char=10', 'https://edisontd.nl/?char=11', 'https://edisontd.nl/?char=12',
    //     'https://edisontd.nl/?char=13', 'https://edisontd.nl/?char=14', 'https://edisontd.nl/?char=15', 'https://edisontd.nl/?char=16', 'https://edisontd.nl/?char=17', 'https://edisontd.nl/?char=18',
    //     'https://edisontd.nl/?char=19', 'https://edisontd.nl/?char=20', 'https://edisontd.nl/?char=21', 'https://edisontd.nl/?char=24', 'https://edisontd.nl/?char=25']
    await page.waitForSelector('table#tbl_dlg')
    // click button with name as submit and text as ok
    await page.click('#tbl_dlg > tbody > tr:nth-child(5) > td:nth-child(3) > button')
    await waitForSelector(page)

    var countries = []
    for (let i in allChars) {
        let allCountries = await getCountries(page, allChars[i])
        countries.push(...allCountries)
    }

    var resultCountries = []
    const downloadPage = await browser.newPage()
    for (let country of countries) {
        console.log(`\nFetching documents for ${country.name}`)
        if (country.link === '') continue
        let countryData = await getCountryData(page, downloadPage, country)
        resultCountries.push(countryData)
    }

    // // write to json file
    fs.writeFileSync('countries.json', JSON.stringify(Object.values(resultCountries)))

    await browser.close()
}

const downloadDocuments = async (page, countryData) => {
    for (let document of countryData.documents) {
        for (let dataItem of document.dataItems) {
            for (let item of dataItem.items) {
                const char = countryData.name.charAt(0)
                const replacedDocName = document.name.replaceAll("/", "-")
                const rootPath = `images/${char}/${countryData.name}/${replacedDocName}`
                if (item.items) {
                    for (let subItem of item.items) {
                        const url = subItem.link
                        let name = subItem.name.replaceAll("/", "-")
                        let replacedItemName = item.name.replaceAll("/", "-")
                        const path = `${rootPath}/${replacedItemName}/${name}.jpg`
                        createDirectories(countryData, replacedDocName, replacedItemName)
                        await downloadFile(page, url, path, name)
                    }
                } else {
                    const url = item.link
                    let name = item.name.replaceAll("/", "-")
                    const path = `${rootPath}/${name}.jpg`
                    createDirectories(countryData, replacedDocName, null)
                    await downloadFile(page, url, path, name)
                }
            }
        }
    }
}

const downloadFile = async (page, url, path, name) => {
    const viewSource = await page.goto(url)
    // await page.waitForNetworkIdle()
    fs.writeFile(path, await
        viewSource.buffer(), function (err) {
            if (err) {
                return console.log(err)
            }
            console.log(`The file ${name}.jpg was saved!`)
        }
    )
}

const createDirectories = (country, docName, itemName) => {
    const char = country.name.charAt(0)
    if (!fs.existsSync('images')) {
        fs.mkdirSync('images')
    }
    if (!fs.existsSync(`images/${char}`)) {
        fs.mkdirSync(`images/${char}`)
    }

    if (!fs.existsSync(`images/${char}/${country.name}`)) {
        fs.mkdirSync(`images/${char}/${country.name}`)
    }
    if (!fs.existsSync(`images/${char}/${country.name}/${docName}`)) {
        fs.mkdirSync(`images/${char}/${country.name}/${docName}`)
    }
    if (itemName) {
        if (!fs.existsSync(`images/${char}/${country.name}/${docName}/${itemName}`)) {
            fs.mkdirSync(`images/${char}/${country.name}/${docName}/${itemName}`)
        }
    }
}

const getCountryData = async (page, downloadPage, country) => {
    const docs = await getCountryDocuments(page, country)
    country.documents = docs
    for (let i in docs) {
        let docItem = await getDocumentItems(page, country, docs[i])
        country.documents[i].dataItems = docItem
    }
    await downloadDocuments(downloadPage, country)
    return country
}


const getCountries = async (page, char) => {
    var countries = []
    await page.goto(char)
    await waitForSelector(page)
    // get the frame frame[src="?frame=list"]
    const frame = await page.frames().find(f => f.url().includes('?frame=list'))
    // get elements from the table tbl_lbl_ltr
    const table = await frame.$('table#tbl_lbl_ltr')
    const rows = await table.$$('tr')
    for (let row of rows) {
        const cell = await row.$('td')
        const text = await cell.evaluate(node => node.innerText)
        if (text === '') continue
        const anchor = await cell.$('a')
        let href = ''
        if (anchor) {
            href = await anchor.evaluate(node => node.href)
        }
        countries.push({ name: text, link: href, documents: [] })
    }
    return countries
}


const getCountryDocuments = async (page, country) => {
    var documents = []
    await page.goto(country.link).catch(e => console.log(e, country.link))
    await waitForSelector(page)
    const frame = await page.frames().find(f => f.url().includes('?frame=list'))
    const table = await frame.$('table#tbl_lbl_ltr')
    const rows = await table.$$('tr')
    for (let row of rows) {
        const cell = await row.$('td')
        const text = await cell.evaluate(node => node.innerText)
        if (text === '') continue
        const anchor = await cell.$('a')
        let href = ''
        if (anchor) {
            href = await anchor.evaluate(node => node.href)
        }
        documents.push({ name: text, link: href })
    }
    return documents
}

const getDocumentItems = async (page, country, document) => {
    if (country.documents.length > 0) {
        await page.goto(country.link)
        await waitForSelector(page)
        let dataItems = []
        await page.goto(document.link)
        await waitForSelector(page)

        const frame = await page.frames().find(f => f.url().includes('?frame=list'))
        const anchors = await frame.$$('a#a_thb')
        for (let anchor of anchors) {
            const href = await anchor.evaluate(node => node.href)
            dataItems.push({ link: href })
        }

        console.log('fetching data items for', document.name)
        for (let dataItem of dataItems) {
            let items = await getDocumentDetails(page, dataItem)
            dataItem.items = items
        }

        return dataItems
    }
}

// const getDocumentItems = async (page, country) => {
//     if (country.documents.length > 0) {
//         await page.goto(country.link)
//         await waitForSelector(page)
//         for (let i in country.documents) {
//             const document = country.documents[i]
//             dataItems = []
//             await page.goto(document.link)
//             await waitForSelector(page)

//             const frame = await page.frames().find(f => f.url().includes('?frame=list'))
//             const anchors = await frame.$$('a#a_thb')
//             for (let anchor of anchors) {
//                 const href = await anchor.evaluate(node => node.href)
//                 dataItems.push({ link: href })
//             }
//             country.documents[i].dataItems = dataItems
//         }

//         for (let document of country.documents) {
//             console.log('fetching data items for', document.name)
//             await page.goto(document.link)
//             await waitForSelector(page)
//             for (let dataItem of document.dataItems) {
//                 await getDocumentDetails(page, dataItem)
//             }
//         }
//     }
// }

const getDocumentDetails = async (page, dataItem) => {
    await page.goto(dataItem.link)
    await waitForSelector(page)
    const viewFrame = await page.frames().find(f => f.url().includes('?frame=view'))
    if (viewFrame) {
        const listFrame = await page.frames().find(f => f.url().includes('?frame=list'))
        if (listFrame) {
            // get the table with id tbl_lbl_ltr
            const table = await listFrame.$('table#tbl_lbl_ltr')
            // get td with id td_lbl_ltr
            const cell = await table.$$('#td_lbl_ltr')
            // get all doc_ids and doc_names
            var items = []
            for (let c of cell) {
                const anchor = await c.$('a')
                const href = await anchor.evaluate(node => node.href)
                // get txt
                const text = await anchor.evaluate(node => node.innerText)
                items.push({ link: href, name: text })
            }
            for (item of items) {
                await page.goto(item.link)
                await waitForSelector(page)
                const items = await getDocumentImageDetails(page)
                item.items = items
            }
            return items
            // dataItem.items = items
        } else {
            const items = await getDocumentImageDetails(page)
            return items
            // dataItem.items = items
        }
    }
}

const getDocumentImageDetails = async (page) => {
    const thumbNailFrame = await page.frames().find(f => f.url().includes('?frame=thbs'))
    // get table with id tbl_thb
    const table = await thumbNailFrame.$('table#tbl_thb')
    // for each table row get the td  with id td_thb and get nested table
    const row = await table.$('tr')
    const cells = await row.$$('td#td_thb')
    var items = []
    for (let cell of cells) {
        const table = await cell.$('table')
        // this table contains 2 rows, get td with id td_thb_img to get image link and td with id td_thb_ttl to get tex
        const td = await table.$('#td_thb_img')
        const img = await td.$('img')
        const anchor = await td.$('a')
        let imgSrc = ''
        if (img) {
            imgSrc = await img.evaluate(node => node.src)
        } else {
            imgSrc = await anchor.evaluate(node => node.href)
        }
        imgSrc = imgSrc.replace('doc_thb', 'doc_ima')
        const title = await table.$('#td_thb_ttl')
        const text = await title.evaluate(node => node.innerText)
        items.push({ name: text, link: imgSrc })
    }
    return items;
}

const waitForSelector = async (page) => {
    await page.waitForSelector('html > frameset > frameset > frameset')
}

main()