const Imap = require('imap');
const { simpleParser } = require('mailparser');

module.exports = async (req, res) => {
  const alias = req.query.alias;                       // 邮箱前缀
  const domain = req.query.domain || 'dou.us.ci';      // 默认域名
  if (!alias) return res.json({ code: null });

  const imap = new Imap({
    user: `${alias}@${domain}`,
    password: process.env.MAIL_PASS,                  // 在 Vercel 面板添加
    host: 'imappro.zoho.com',
    port: 993,
    tls: true
  });

  return new Promise((resolve) => {
    imap.once('ready', () => {
      imap.openBox('INBOX', false, () => {
        imap.search(['UNSEEN', ['HEADER', 'SUBJECT', 'FB-']], (err, results) => {
          if (err || !results.length) { imap.end(); return resolve(res.json({ code: null })); }
          const f = imap.fetch(results, { bodies: '' });
          f.on('message', msg => {
            msg.on('body', stream => {
              simpleParser(stream, (err, parsed) => {
                const m = parsed.subject.match(/FB-(\d{5})/);
                if (m) {
                  imap.setFlags(results, ['\\Seen']);   // 标记已读
                  imap.end();
                  return resolve(res.json({ code: m[1] }));
                }
              });
            });
          });
          f.once('end', () => { imap.end(); resolve(res.json({ code: null })); });
        });
      });
    });
    imap.once('error', () => res.json({ code: null }));
    imap.connect();
  });
};

