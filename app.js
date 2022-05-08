const axios = require('axios');
const download = require('image-downloader');
const path = require("path");
const fs = require('fs');

const headers = {
    "traceparent": "00-576890bd3c893f83637928195f82b0cd-dc849be545e85ffd-00",
    "x-xsrf-token": "jFBUOqT446VUgzRM2R1SL9-p",
    "cookie": "XSRF-TOKEN=jFBUOqT446VUgzRM2R1SL9-p; login_sid_t=ab5503e88595eea30e7fd9775d6e776d; cross_origin_proto=SSL; _s_tentry=weibo.com; Apache=3420289519400.661.1651997977262; SINAGLOBAL=3420289519400.661.1651997977262; ULV=1651997977266:1:1:1:3420289519400.661.1651997977262:; wb_view_log=1920*10801; WBtopGlobal_register_version=2022050816; SSOLoginState=1651998003; SUB=_2A25Pcw1iDeRhGeBO61oX9C7LyD2IHXVsn5MqrDV8PUJbkNAfLXT9kW1NSlElC0efATOYX1H-CbfKaYVTJM_waMDl; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WWcad9jW5UAiyjNr49H5ux05NHD95Qceh5RSoB7S0epWs4DqcjGMcSEIgS0IBtt; WBPSESS=HrdmiWrVizRqnI8Hel7aTP751nZ3SW-t1gc25VCqxAB9AqLgj_-lMzF4KdFSa1bP15H8ailqswBCXN5Oi82AaioQPQuUSYXj5lWAGnqRvIEgpHTdzEBgT1KmbZNZwlRxHu8AJTTHhckY2uK6Ao9NYQ==",
};


let config = {
    uid: '2960574121',
    selfPath: '袁泉',
    limit: 100,
}




try {
    main();
} catch (e) {
    console.log(e);
}



// 获取单个sinceId 和 pictureId，pictureId用于构建URL
function getAblum(url, headers) {

    /*
     * @params: 
     *  uid: 用户id
     *  sinceId：首次为0，且会返回下次请求的sinceId 
     *      first. https://weibo.com/ajax/profile/getImageWall?uid=6008640731&sinceid=0&has_album=true
     *          sinceid: 4716535406264850_-1_20211230_-1
     *      mid.  https://weibo.com/ajax/profile/getImageWall?uid=6008640731&sinceid=4716535406264850_-1_20211230_-1
     *              sinceid: 4710255504394978_-1_20211220_-1
     *      end.  https://weibo.com/ajax/profile/getImageWall?uid=6008640731&sinceid=4490016823011704_-1_20200405_-1
     *              sineid: 0
     * hasAlbum: 
     *      第一次请求为true，其余为false
     * @return 
     *  imgIdList []
     * 
     * axios 返回data的格式
     * {
     *  data: {
     *    album_list?，
     *    album_since_id?,
     *    since_id: string, // 下一次请求的id
     *    list: {
     *      pid, // 主要id，用于构建image路径  : https://wx3.sinaimg.cn/mw2000/${pid}.jpg
     *      mid,
     *      is_paid,
     *      timeline_month,
     *      timeline_year,
     *      object_id,
     *      type: pic,livephoto,
     *      video?  
     *    }
     *  }
     *  bottom_tips_visible,
     *  bottom_tips_text,
     *  ok: 1|0
     * }
     */
    return new Promise(async (resolve, reject) => {
        let res = await axios.get(url, { headers });
        if (res.data.ok != 1) {
            reject(false);
            return;
        }
        let data = res.data.data;
        let _sinceId = data.since_id == 0 ? -1 : data.since_id, // 把最后一次sinceid记为-1
            _list = data.list;
        resolve({
            sinceId: _sinceId,
            resList: _list
        })

    })
}


// 获取整体的pictureUrl列表
function generateAllPicId() {


    let sinceId = '0',
        has_album = true,
        picIdList = [];

    return new Promise(async (resolve, reject) => {
        while (has_album === true) {

            if (sinceId == '0') {// 第一次请求
                url = `https://weibo.com/ajax/profile/getImageWall?uid=${config.uid}&sinceid=0&has_album=true`;
            } else if (sinceId == -1) { // 最后一次请求
                has_album = false;
            } else {
                url = `https://weibo.com/ajax/profile/getImageWall?uid=${config.uid}&sinceid=${sinceId}`;
            }

            if (has_album) {
                let res = await getAblum(url, headers);
                sinceId = res.sinceId;
                picIdList = [...picIdList, ...res.resList.map(item => `https://wx3.sinaimg.cn/mw2000/${item.pid}.jpg`)];
                let date = /_(\d{8})_/.exec(sinceId).pop();
                if (date) {
                    date = date.replace(/(\d{4})(\d{2})(\d{2})/, (all, y, m, d) => {
                        return `${y}年${m}月${d}日`
                    });
                    console.log(`~${date} 共计${picIdList.length}张图片`);
                }
            }

            if (config.limit > -1 && config.limit < picIdList.length) { // 超过了最大下载量，停止爬取
                has_album = false;
            }

        }
        resolve(picIdList);
    });
}


// 传入Url列表，下载到selfPath路径
async function downloadImg(urls, selfPath = 'imgs') {
    for (let i = 0; i < urls.length; i++) {
        const options = {
            url: urls[i],
            dest: path.join(__dirname, selfPath),
        };
        let { filename } = await download.image(options);
        console.log(`${i + 1}/${urls.length} Saved to ${filename}`);
    }
}

// 创建目录
async function mkdir(selfPath) {
    let fullpath = path.join(__dirname, selfPath);
    let stat = fs.existsSync(fullpath);
    if (!stat) { // true 存在，false不存在
        fs.mkdirSync(fullpath);
    }
}

async function main() {
    mkdir(config.selfPath);
    let pidUrls = await generateAllPicId();
    downloadImg(pidUrls, config.selfPath);
}

