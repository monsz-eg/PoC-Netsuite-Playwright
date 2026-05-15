import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const FIXTURES = path.resolve(__dirname, '../tests/fixtures/peppol');

const ISO_BASE =
  'https://raw.githubusercontent.com/Schematron/schematron/master/trunk/schematron/code';

const URLS = {
  cenXslt:
    'https://raw.githubusercontent.com/ConnectingEurope/eInvoicing-EN16931/master/ubl/xslt/EN16931-UBL-validation.xslt',
  peppolSch:
    'https://raw.githubusercontent.com/OpenPEPPOL/peppol-bis-invoice-3/master/rules/sch/PEPPOL-EN16931-UBL.sch',
  isoInclude: `${ISO_BASE}/iso_dsdl_include.xsl`,
  isoAbstract: `${ISO_BASE}/iso_abstract_expand.xsl`,
  isoSvrl: `${ISO_BASE}/iso_svrl_for_xslt2.xsl`,
  isoSkeleton: `${ISO_BASE}/iso_schematron_skeleton_for_saxon.xsl`,
};

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location!, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
  });
}

const PROJECT_ROOT = path.resolve(__dirname, '..');
const XSLT3_BIN = path.join(
  PROJECT_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'xslt3.cmd' : 'xslt3',
);

function xslt3(xsl: string, src: string, out: string): void {
  execSync(`"${XSLT3_BIN}" -xsl:"${xsl}" -s:"${src}" -o:"${out}"`, {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
  });
}

function xslt3Export(xsl: string, sef: string): void {
  execSync(`"${XSLT3_BIN}" -xsl:"${xsl}" -export:"${sef}" -nogo`, {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
  });
}

async function main() {
  fs.mkdirSync(FIXTURES, { recursive: true });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peppol-setup-'));

  try {
    console.log('Downloading CEN EN16931 pre-compiled XSLT...');
    await download(URLS.cenXslt, path.join(FIXTURES, 'EN16931-UBL-validation.xslt'));

    console.log('Downloading PEPPOL Schematron...');
    const peppolSch = path.join(tmp, 'PEPPOL-EN16931-UBL.sch');
    await download(URLS.peppolSch, peppolSch);

    console.log('Downloading ISO Schematron skeleton XSLTs...');
    const isoInclude = path.join(tmp, 'iso_dsdl_include.xsl');
    const isoAbstract = path.join(tmp, 'iso_abstract_expand.xsl');
    const isoSvrl = path.join(tmp, 'iso_svrl_for_xslt2.xsl');
    const isoSkeleton = path.join(tmp, 'iso_schematron_skeleton_for_saxon.xsl');
    await Promise.all([
      download(URLS.isoInclude, isoInclude),
      download(URLS.isoAbstract, isoAbstract),
      download(URLS.isoSvrl, isoSvrl),
      download(URLS.isoSkeleton, isoSkeleton),
    ]);

    console.log('Compiling PEPPOL Schematron (step 1/3: resolve includes)...');
    const step1 = path.join(tmp, 'step1.sch');
    xslt3(isoInclude, peppolSch, step1);

    console.log('Compiling PEPPOL Schematron (step 2/3: expand abstracts)...');
    const step2 = path.join(tmp, 'step2.sch');
    xslt3(isoAbstract, step1, step2);

    console.log('Compiling PEPPOL Schematron (step 3/3: generate XSLT validator)...');
    const peppolXsl = path.join(tmp, 'PEPPOL-EN16931-UBL.xsl');
    xslt3(isoSvrl, step2, peppolXsl);

    console.log('Exporting CEN validator to SEF...');
    const cenXslt = path.join(FIXTURES, 'EN16931-UBL-validation.xslt');
    xslt3Export(cenXslt, path.join(FIXTURES, 'EN16931-UBL-validation.sef.json'));

    console.log('Exporting PEPPOL validator to SEF...');
    xslt3Export(peppolXsl, path.join(FIXTURES, 'PEPPOL-EN16931-UBL.sef.json'));

    console.log(`\nDone. Fixtures written to:\n  ${FIXTURES}`);
    fs.readdirSync(FIXTURES).forEach((f) => console.log(`  ${f}`));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
