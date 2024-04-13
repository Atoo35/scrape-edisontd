const puppeteer = require('puppeteer')
const fs = require('fs')
const root = 'https://edisontd.nl'

const main = async () => {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(root)
    // const allChars = ['https://edisontd.nl/?char=0']
    const allChars = ['https://edisontd.nl/?char=0', 'https://edisontd.nl/?char=1', 'https://edisontd.nl/?char=2', 'https://edisontd.nl/?char=3', 'https://edisontd.nl/?char=4', 'https://edisontd.nl/?char=5', 'https://edisontd.nl/?char=6', 'https://edisontd.nl/?char=7', 'https://edisontd.nl/?char=8', 'https://edisontd.nl/?char=9', 'https://edisontd.nl/?char=10', 'https://edisontd.nl/?char=11', 'https://edisontd.nl/?char=12', 'https://edisontd.nl/?char=13']
    //  'https://edisontd.nl/?char=14', 'https://edisontd.nl/?char=15', 'https://edisontd.nl/?char=16', 'https://edisontd.nl/?char=17', 'https://edisontd.nl/?char=18', 'https://edisontd.nl/?char=19', 'https://edisontd.nl/?char=20', 'https://edisontd.nl/?char=21', 'https://edisontd.nl/?char=24', 'https://edisontd.nl/?char=25']
    await page.waitForSelector('table#tbl_dlg')
    // click button with name as submit and text as ok
    await page.click('#tbl_dlg > tbody > tr:nth-child(5) > td:nth-child(3) > button')
    await waitForSelector(page)

    var countries = []
    for (let i in allChars) {
        await getCountries(page, allChars[i], countries)
    }

    console.log('countries fetched')
    for (let country of countries) {
        country.documents = []
        console.log(`Fetching documents for ${country.name}`)
        if (country.link === '') continue
        await getCountryDocuments(page, country)
        await getDocumentItems(page, country)
    }

    console.log('documents fetched')
    // fetch data items
    for (let country of countries) {
        console.log(`Fetching data items for ${country.name}`)
        if (country.link === '') continue
        await page.goto(country.link)
        await waitForSelector(page)
        if (country.documents.length > 0) {
            for (let document of country.documents) {
                console.log('fetching data items for', document.name)
                await page.goto(document.link)
                await waitForSelector(page)
                for (let dataItem of document.dataItems) {
                    await getDocumentDetails(page, dataItem)
                }
            }
        }
    }
    console.log('data items fetched')

    // await page.goto('https://edisontd.nl/?ctry=169')
    // await waitForSelector(page)
    // await page.goto('https://edisontd.nl/?type=233')
    // await waitForSelector(page)
    // await getDocumentDetails(page, { link: 'https://edisontd.nl/?modl=2693' })
    // await page.goto('https://edisontd.nl/?modl=2694')
    // await waitForSelector(page)
    // await page.waitForNetworkIdle()


    // printData(countries)

    //write to json file
    fs.writeFileSync('countries.json', JSON.stringify(Object.values(countries)))

    await browser.close()
}

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
                item.dataItems = items
            }
            dataItem.items = items
        } else {
            const items = await getDocumentImageDetails(page)
            dataItem.dataItems = items
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

const getCountries = async (page, char, countries) => {
    await page.goto(char)
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
        countries.push({ name: text, link: href })
    }
}


const getCountryDocuments = async (page, country) => {
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
        country.documents.push({ name: text, link: href })
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
                dataItems.push({ link: href })
            }
            country.documents[i].dataItems = dataItems
        }
    }
}

const printData = (countries) => {
    for (let country of countries) {
        console.log('Name:', country.name)
        console.log('Link:', country.link)
        for (let document of country.documents) {
            console.log('Document Name:', document.name)
            console.log('Document Link:', document.link)
            console.log('Data Items:', document.dataItems)
        }
    }
}

const waitForSelector = async (page) => {
    await page.waitForSelector('html > frameset > frameset > frameset')
}

main()