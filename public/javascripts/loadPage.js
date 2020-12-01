const puppeteer = require('puppeteer');
const dayjs = require('dayjs')
const dotenv = require('dotenv')
dotenv.config();
const twilio = require('twilio');
require("./global");
const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const oaklandHospitals = ['Highland and Fairmont Hospitals', 'Alameda Hospital', 'Sutter Health'];
const oaklandManagerAss = ['Vasquez,Angela', 'Odunikan,Kehinde', 'Lauderdale,LaRonda', 'Mulleague,Teresa',
  'Mathiesen,Desiree', 'Fabreo,Kristine', 'Thrower,Anetra', 'Davila,Marta', 'Mulleague,Teresa', 'Lopez,Cindyann']

module.exports = class LoadPage {
  constructor() {
  }

  async signInPage() {
    global.messages.push('----load table succeed----', dayjs().format());

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(
      'https://www.extendedcare.com/professional/home/logon.aspx',
      {
        waitUntil: 'networkidle2',
        timeout: 0,
      }
    );

    await page.type('#UserNameTextBox', process.env.PAGE_USERNAME);
    await page.type('#PasswordTextBox', process.env.PAGE_PASSWORD);

    await page.click('#ImageButton1');

    try {
      await page.click('#btnLoginHack');
    } catch (err) {
      console.log('----', err)
    }
    await page.waitForTimeout(5000);

    let data = {};
    const loadData = async (isInit) => {
      if (!isInit) {
        await page.reload();
        await page.waitForTimeout(5000);
        console.log('----reload table succeed----', dayjs().format());
      }

      const infos = await page.$$eval('table#ucViewGrid_dgView>tbody>tr>td:nth-child(3)', tds => tds.map((td) => {
        const cell = td.innerText.split('\n');
        return {referralId: cell[0], dateTime: cell[2]}
      }));
      const hospitalInfos = await page.$$eval('table#ucViewGrid_dgView>tbody>tr>td:nth-child(5)', tds => tds.map((td) => {
        const cell = td.innerText.split('\n');
        return {hospital: cell[1], managerAss: cell[2]};
      }));
      const insuranceInfos = await page.$$eval('table#ucViewGrid_dgView>tbody>tr>td:nth-child(6)', tds => tds.map((td) => {
        const cell = td.innerText.split('\n');
        return {insurance: cell[1]};
      }));

      for (let i = 1; i < infos.length; i++) {
        const {referralId, dateTime} = infos[i];
        const {hospital, managerAss} = hospitalInfos[i];
        const {insurance} = insuranceInfos[i];
        if (!data[referralId]) {
          data[referralId] = {
            referralId,
            dateTime,
            hospital,
            managerAss,
            insurance,
          }
          if (!isInit && (oaklandHospitals.indexOf(hospital) !== -1 || oaklandManagerAss.indexOf(managerAss) !== -1)) {
            console.log('----send Jojo message', isInit, JSON.stringify(data[referralId]));
            // await client.messages.create({
            //   to: `+${process.env.JOJO}`,
            //   from: `+${process.env.TWILIO_NUMBER}`,
            //   body: JSON.stringify(data[referralId]),
            // });
            global.messages.push(data[referralId]);
          }
        }
      }

      await page.waitForTimeout(1000 * 60 * 5);
      loadData(false);
    }

    loadData(true);
  }
};
