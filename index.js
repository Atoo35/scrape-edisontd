const puppeteer = require('puppeteer')
const fs = require('fs')
const root = 'https://edisontd.nl'

const main = async () => {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(root)
    const allChars = ['https://edisontd.nl/?char=0']
    // const allChars = ['https://edisontd.nl/?char=0', 'https://edisontd.nl/?char=1', 'https://edisontd.nl/?char=2', 'https://edisontd.nl/?char=3', 'https://edisontd.nl/?char=4', 'https://edisontd.nl/?char=5', 'https://edisontd.nl/?char=6', 'https://edisontd.nl/?char=7', 'https://edisontd.nl/?char=8', 'https://edisontd.nl/?char=9', 'https://edisontd.nl/?char=10', 'https://edisontd.nl/?char=11', 'https://edisontd.nl/?char=12', 'https://edisontd.nl/?char=13', 'https://edisontd.nl/?char=14', 'https://edisontd.nl/?char=15', 'https://edisontd.nl/?char=16', 'https://edisontd.nl/?char=17', 'https://edisontd.nl/?char=18', 'https://edisontd.nl/?char=19', 'https://edisontd.nl/?char=20', 'https://edisontd.nl/?char=21', 'https://edisontd.nl/?char=24', 'https://edisontd.nl/?char=25']
    await page.waitForSelector('table#tbl_dlg')
    // click button with name as submit and text as ok
    await page.click('#tbl_dlg > tbody > tr:nth-child(5) > td:nth-child(3) > button')
    await waitForSelector(page)

    var countries = []
    for (let i in allChars) {
        await getCountries(page, allChars[i], countries)
    }

    for (let country of countries) {
        country.documents = []
        if (country.link === '') continue
        await getCountryDocuments(page, country)
        await getDocumentItems(page, country)
    }

    printData(countries)
    //write to json file

    fs.writeFileSync('countries.json', JSON.stringify(Object.values(countries)))

    await browser.close()
}

const getCountries = async (page, char, countries) => {
    await page.goto(char)
    // get the frame frame[src="?frame=list"]
    const frame = await page.frames().find(f => f.url().includes('?frame=list'))
    // get elements from the table tbl_lbl_ltr
    const table = await frame.$('table#tbl_lbl_ltr')
    const rows = await table.$$('tr')
    for (let row of rows) {
        const cells = await row.$$('td')
        for (let cell of cells) {
            const text = await cell.evaluate(node => node.innerText)
            if (text === '') continue
            const anchor = await cell.$('a')
            let href = ''
            if (anchor) {
                href = await anchor.evaluate(node => node.href)
            }
            countries.push({ name: text, link: href })
        }
    }
}


const getCountryDocuments = async (page, country) => {
    await page.goto(country.link).catch(e => console.log(e, country.link))
    await waitForSelector(page)
    const frame = await page.frames().find(f => f.url().includes('?frame=list'))
    const table = await frame.$('table#tbl_lbl_ltr')
    const rows = await table.$$('tr')
    for (let row of rows) {
        const cells = await row.$$('td')
        for (let cell of cells) {
            const text = await cell.evaluate(node => node.innerText)
            if (text === '') continue
            const anchor = await cell.$('a')
            let href = ''
            if (anchor) {
                href = await anchor.evaluate(node => node.href)
            }
            country.documents.push({ name: text, link: href })
        }
    }
}

const getDocumentItems = async (page, country) => {
    if (country.documents.length > 0) {
        await page.goto(country.link)
        await waitForSelector(page)
        for (let i in country.documents) {
            const document = country.documents[i]
            dataItems = []
            await page.goto(document.link)
            await waitForSelector(page)

            const frame = await page.frames().find(f => f.url().includes('?frame=list'))
            const anchors = await frame.$$('a#a_thb')
            for (let anchor of anchors) {
                const href = await anchor.evaluate(node => node.href)
                dataItems.push(href)
            }
            country.documents[i].dataItems = dataItems
        }
    }
}

const printData = (countries) => {
    for (let country of countries) {
        console.log('Name:', country.name)
        console.log('Link:', country.link)
        console.log('Documents:', country.documents)
    }
}

const waitForSelector = async (page) => {
    await page.waitForSelector('html > frameset > frameset > frameset')
}

main()