const { SlashCommandBuilder } = require("discord.js");

let shuffledOptions = [];
let currentIndex = 0;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  sabiServer: true,
  deleted: false,
  data: new SlashCommandBuilder()
    .setName("video")
    .setDescription("random witchii video"),

  testOnly: false,

  run: async ({ interaction }) => {
    if (
      shuffledOptions.length === 0 ||
      currentIndex >= shuffledOptions.length
    ) {
      shuffledOptions = shuffleArray([
        "https://www.youtube.com/watch?v=vCHPK2kLQ5M",
        "https://www.youtube.com/watch?v=RZSpoBHLFpA",
        "https://www.youtube.com/watch?v=0cxpgfg9s7Y",
        "https://www.youtube.com/watch?v=C_79oWI4KaU",
        "https://www.youtube.com/watch?v=TKJgOcL20b0",
        "https://www.youtube.com/watch?v=B01DbnpDx1k",
        "https://www.youtube.com/watch?v=SOmJqjuPwYo",
        "https://www.youtube.com/watch?v=j7PU7Gbf-Y4",
        "https://www.youtube.com/watch?v=5Nrn2CU79tQ",
        "https://www.youtube.com/watch?v=TJ3PSTg1UFA",
        "https://www.youtube.com/watch?v=uyWLPdga1n4",
        "https://www.youtube.com/watch?v=DjMKpXn61o4",
        "https://www.youtube.com/watch?v=Kj9J6qGSu3E",
        "https://www.youtube.com/watch?v=41bDh4d8Xqo",
        "https://www.youtube.com/watch?v=1Ljn498NT-M",
        "https://www.youtube.com/watch?v=5T3bcIHsscg",
        "https://www.youtube.com/watch?v=OWZe5hqILVc",
        "https://www.youtube.com/watch?v=WgDujWZjtbM",
        "https://www.youtube.com/watch?v=_cUC_B39nvQ",
        "https://www.youtube.com/watch?v=TxhbR3yWQg4",
        "https://www.youtube.com/watch?v=PMl1U9JTpK4",
        "https://www.youtube.com/watch?v=x2hWBmNCtYo",
        "https://www.youtube.com/watch?v=ENHkXbAFw7Q",
        "https://www.youtube.com/watch?v=ych3l2VZdls",
        "https://www.youtube.com/watch?v=lr0DM_LcyQk",
        "https://www.youtube.com/watch?v=sf7ouFfqjOo",
        "https://www.youtube.com/watch?v=yKdpyxDQx6A",
        "https://www.youtube.com/watch?v=VVmgDDzOxZc",
        "https://www.youtube.com/watch?v=ROGYUIe6ji8",
        "https://www.youtube.com/watch?v=yiEFeah-P6Q",
        "https://www.youtube.com/watch?v=ZNN0z9_4Zyo",
        "https://www.youtube.com/watch?v=VDWajEbLfuI",
        "https://www.youtube.com/watch?v=_zjolWd0QjA",
        "https://www.youtube.com/watch?v=YtjRHZXMFFQ",
        "https://www.youtube.com/watch?v=5vHbpL0OqOE",
        "https://www.youtube.com/watch?v=BwQ7guKIi1I",
        "https://www.youtube.com/watch?v=TITw4rhXb0o",
        "https://www.youtube.com/watch?v=zHW3NPFNm84",
        "https://www.youtube.com/watch?v=lt8mro4do9k",
        "https://www.youtube.com/watch?v=swtqsvSDz-E",
        "https://www.youtube.com/watch?v=ebxWMidUwJo",
        "https://www.youtube.com/watch?v=8PgDD8NgHEM",
        "https://www.youtube.com/watch?v=sIpzKx8waGI",
        "https://www.youtube.com/watch?v=fzRHCBu6Mao",
        "https://www.youtube.com/watch?v=MKkzmAeIQO0",
        "https://www.youtube.com/watch?v=1woFadNT_oo",
        "https://www.youtube.com/watch?v=yrxKbOzkgts",
        "https://www.youtube.com/watch?v=Vpc_ysgAol8",
        "https://www.youtube.com/watch?v=2RTh25bn_HQ",
        "https://www.youtube.com/watch?v=1YGKv-Gb9SA",
        "https://www.youtube.com/watch?v=Fm9yA3RgE_s",
        "https://www.youtube.com/watch?v=57AYoIozXIs",
        "https://www.youtube.com/watch?v=3GBLL2Io-NU",
        "https://www.youtube.com/watch?v=HhvDOn4zyXg",
        "https://www.youtube.com/watch?v=h2cUu6il8nY",
        "https://www.youtube.com/watch?v=-vDYYt4FxRg",
        "https://www.youtube.com/watch?v=MpnF4SdzYLc",
        "https://www.youtube.com/watch?v=CLmRc7l9kXQ",
        "https://www.youtube.com/watch?v=W1meUUxT0-M",
        "https://www.youtube.com/watch?v=hYh9379vsHw",
        "https://www.youtube.com/watch?v=qo8foI8P-2A",
        "https://www.youtube.com/watch?v=nVdc1Ra2-1U",
        "https://www.youtube.com/watch?v=h3LssPXr1OM",
        "https://www.youtube.com/watch?v=t6zRCZ5edQM",
        "https://www.youtube.com/watch?v=cau153xki98",
        "https://www.youtube.com/watch?v=_Q82Asd-wO4",
        "https://www.youtube.com/watch?v=fEWhqKzHk38",
        "https://www.youtube.com/watch?v=qE8dR_brsMg",
        "https://www.youtube.com/watch?v=p4lXmRO6VWU",
        "https://www.youtube.com/watch?v=MCjAmn_69R8",
        "https://www.youtube.com/watch?v=5-ezOmefLfs",
        "https://www.youtube.com/watch?v=H6iaeg0DkBg",
        "https://www.youtube.com/watch?v=eLMn6JSv4O4",
        "https://www.youtube.com/watch?v=QXfKt_lrlrk",
        "https://www.youtube.com/watch?v=xsDTZaLPij0",
        "https://www.youtube.com/watch?v=qbTzZMLRglA",
        "https://www.youtube.com/watch?v=Zfspn_eeEJg",
        "https://www.youtube.com/watch?v=ZEgh4-EuHUc",
        "https://www.youtube.com/watch?v=0x4FzAL_Xas",
        "https://www.youtube.com/watch?v=fCMJGCZpGSQ",
        "https://www.youtube.com/watch?v=UywOgn_AzuA",
        "https://www.youtube.com/watch?v=aY25JOnSZBc",
        "https://www.youtube.com/watch?v=0BY_6ZCGte8",
        "https://www.youtube.com/watch?v=h-7ejDGZiI8",
        "https://www.youtube.com/watch?v=daMLbiRElX8",
        "https://www.youtube.com/watch?v=N_I4ArgH2u8",
        "https://www.youtube.com/watch?v=yHfTxYakdaM",
        "https://www.youtube.com/watch?v=2xljxyJIkFs",
        "https://www.youtube.com/watch?v=hErCLFbERxQ",
        "https://www.youtube.com/watch?v=Tp59T61dA-4",
        "https://www.youtube.com/watch?v=At2Py2GUBME",
        "https://www.youtube.com/watch?v=rhbdNGgRfZQ",
        "https://www.youtube.com/watch?v=Lppr0rNV0Jc",
        "https://www.youtube.com/watch?v=5AWUmYP5POQ",
        "https://www.youtube.com/watch?v=sXYNtxUAPQs",
        "https://www.youtube.com/watch?v=diO2fXQ96ds",
        "https://www.youtube.com/watch?v=86lxizbBj3k",
        "https://www.youtube.com/watch?v=koJ5sK4_pBU",
        "https://www.youtube.com/watch?v=C5AWkMERZDg",
        "https://www.youtube.com/watch?v=bYeNB78FN94",
        "https://www.youtube.com/watch?v=1U6bCAjP25U",
        "https://www.youtube.com/watch?v=prUdhfIMlgU",
        "https://www.youtube.com/watch?v=lq_4tqmbDmw",
        "https://www.youtube.com/watch?v=0PA0lgJG71o",
        "https://www.youtube.com/watch?v=eD6a5Hmahdc",
        "https://www.youtube.com/watch?v=fRHdx1OTHM8",
        "https://www.youtube.com/watch?v=lvi9Fw6Fhmc",
        "https://www.youtube.com/watch?v=sR-81-Sg59w",
        "https://www.youtube.com/watch?v=CEhcLU0V-og",
        "https://www.youtube.com/watch?v=k2741XJL4h0",
        "https://www.youtube.com/watch?v=_qPWNam59vE",
        "https://www.youtube.com/watch?v=naSlAJgugaQ",
        "https://www.youtube.com/watch?v=wzDBPSwXwVo",
        "https://www.youtube.com/watch?v=gIDJf1ohyQE",
        "https://www.youtube.com/watch?v=e9bIatV2WbQ",
        "https://www.youtube.com/watch?v=kVJz3lLRNkk",
        "https://www.youtube.com/watch?v=slkjCGtAqIA",
        "https://www.youtube.com/watch?v=mei1L4gBBKY",
        "https://www.youtube.com/watch?v=H2v6YtXiT-w",
        "https://www.youtube.com/watch?v=ohkRWl2Xk5M",
        "https://www.youtube.com/watch?v=uibXBRi2KBA",
        "https://www.youtube.com/watch?v=Ber0Tw8_0bk",
        "https://www.youtube.com/watch?v=b9YsYab9zmk",
        "https://www.youtube.com/watch?v=Ccujs9mJfpQ",
        "https://www.youtube.com/watch?v=QiOqzyRUZBA",
        "https://www.youtube.com/watch?v=J7Fk6VlJ9kU",
        "https://www.youtube.com/watch?v=gYWRk6liog0",
        "https://www.youtube.com/watch?v=kRhSAPS9zuc",
        "https://www.youtube.com/watch?v=KiayVyTDArg",
        "https://www.youtube.com/watch?v=v2o_7jFbJHo",
        "https://www.youtube.com/watch?v=N023nwKbZe4",
        "https://www.youtube.com/watch?v=OXPw9_Z3FwI",
        "https://www.youtube.com/watch?v=D71ndxWrRKA",
        "https://www.youtube.com/watch?v=F6nbEu8uAkA",
        "https://www.youtube.com/watch?v=SvN5W0KVu94",
        "https://www.youtube.com/watch?v=RcXkLqZXvM8",
        "https://www.youtube.com/watch?v=mlRafrNCdlA",
        "https://www.youtube.com/watch?v=d1W_gb6xFv8",
        "https://www.youtube.com/watch?v=bF95ucNrwwI",
        "https://www.youtube.com/watch?v=gsLUfwdT5VU",
        "https://www.youtube.com/watch?v=rHOACmaUWZ8",
        "https://www.youtube.com/watch?v=hoiwEN4JE-8",
        "https://www.youtube.com/watch?v=TdZPBjjyLTI",
        "https://www.youtube.com/watch?v=qJLKAiqDyE0",
        "https://www.youtube.com/watch?v=UCteODy3DZA",
        "https://www.youtube.com/watch?v=sCi28uC7E7k",
        "https://www.youtube.com/watch?v=OXW7ZGNfS08",
        "https://www.youtube.com/watch?v=LJF-I369DsE",
        "https://www.youtube.com/watch?v=l6FWSc_YIvM",
        "https://www.youtube.com/watch?v=NDlG9ZpLRek",
        "https://www.youtube.com/watch?v=iDUUZWOOy-I",
        "https://www.youtube.com/watch?v=98C4XE0U4Lk",
        "https://www.youtube.com/watch?v=6X2GCsKW8vk",
        "https://www.youtube.com/watch?v=NIAmY7RnsLY",
        "https://www.youtube.com/watch?v=v0gjfxFbzps",
        "https://www.youtube.com/watch?v=ssKA6Btu8l0",
        "https://www.youtube.com/watch?v=uFlhl9lgE3E",
        "https://www.youtube.com/watch?v=4ymyR8yK4tQ",
        "https://www.youtube.com/watch?v=kDPuPPQQmyE",
        "https://www.youtube.com/watch?v=BexVUbxvz4M",
        "https://www.youtube.com/watch?v=rv0i-oZTA_M",
        "https://www.youtube.com/watch?v=0OJY86_1xGQ",
        "https://www.youtube.com/watch?v=5Dtxo8qekYo",
        "https://www.youtube.com/watch?v=YdEWUWptjWw",
        "https://www.youtube.com/watch?v=V_QAjKzdKCY",
        "https://www.youtube.com/watch?v=WMA91yODCHY",
        "https://www.youtube.com/watch?v=2jG_6BAKJsc",
        "https://www.youtube.com/watch?v=sh0tznqxVKg",
        "https://www.youtube.com/watch?v=JqFwnGDGMNk",
        "https://www.youtube.com/watch?v=RTIJa-Agkyk",
        "https://www.youtube.com/watch?v=Xu9EDo6AGWM",
        "https://www.youtube.com/watch?v=BiIdnsalLuE",
        "https://www.youtube.com/watch?v=3YPtGgVlQqk",
        "https://www.youtube.com/watch?v=HZOo-VKQ8Fw",
        "https://www.youtube.com/watch?v=sTqbFKapF6o",
        "https://www.youtube.com/watch?v=Lj4zyp6Wq5A",
        "https://www.youtube.com/watch?v=PmtKz-L7Qq0",
        "https://www.youtube.com/watch?v=Fma7f3GSdcQ",
        "https://www.youtube.com/watch?v=vyo58MdZdfc",
        "https://www.youtube.com/watch?v=HqwMbeyorx4",
        "https://www.youtube.com/watch?v=JGsWvuxo8ws",
        "https://www.youtube.com/watch?v=NoETmTE2_0o",
        "https://www.youtube.com/watch?v=DexBjgDLc7c",
        "https://www.youtube.com/watch?v=dC63hMKTjqU",
        "https://www.youtube.com/watch?v=poPqGATAwuA",
        "https://www.youtube.com/watch?v=fWLiDKeC8jM",
        "https://www.youtube.com/watch?v=-EcY5BNXXn8",
        "https://www.youtube.com/watch?v=sovM1Xa2jNs",
        "https://www.youtube.com/watch?v=PGpF16UX9vI",
        "https://www.youtube.com/watch?v=y6NwIIeaadQ",
        "https://www.youtube.com/watch?v=1RvQ6PZf0lg",
        "https://www.youtube.com/watch?v=oa79vSkXkjc",
        "https://www.youtube.com/watch?v=u3dq2gytHio",
        "https://www.youtube.com/watch?v=LwzdwkH9bXc",
        "https://www.youtube.com/watch?v=yXVydPrNGEA",
        "https://www.youtube.com/watch?v=G6kuQ5op3RI",
        "https://www.youtube.com/watch?v=bcQ9vfcLvOE",
        "https://www.youtube.com/watch?v=Z8bucLTXcjc",
        "https://www.youtube.com/watch?v=LaVI4GVPdmE",
        "https://www.youtube.com/watch?v=nbWBLwBsshA",
        "https://www.youtube.com/watch?v=cavFRrVVQwc",
        "https://www.youtube.com/watch?v=HeA95K8asPY",
        "https://www.youtube.com/watch?v=zwCn7sIAfR0",
        "https://www.youtube.com/watch?v=mSW_rOCSqhc",
        "https://www.youtube.com/watch?v=fCdmzQuSwjo",
        "https://www.youtube.com/watch?v=4Qe8ot3X764",
        "https://www.youtube.com/watch?v=qUiqQ8nBXTA",
        "https://www.youtube.com/watch?v=etlJepVidps",
        "https://www.youtube.com/watch?v=uKcWKxMphi4",
        "https://www.youtube.com/watch?v=WbThvfYKbvM",
        "https://www.youtube.com/watch?v=3gc8Sr0Lk90",
        "https://www.youtube.com/watch?v=oyeflEvL_a0",
        "https://www.youtube.com/watch?v=cyALWD4JDJ0",
        "https://www.youtube.com/watch?v=SUVxa677TSo",
        "https://www.youtube.com/watch?v=o40nqWN9kY0",
        "https://www.youtube.com/watch?v=17AsKEXlOn8",
        "https://www.youtube.com/watch?v=aGy3OzkdyPw",
        "https://www.youtube.com/watch?v=R_0Jnhaa_8s",
        "https://www.youtube.com/watch?v=vRzHo-K-zb0",
        "https://www.youtube.com/watch?v=RxdbRUJ-gBA",
        "https://www.youtube.com/watch?v=C9PVbtUN7vY",
        "https://www.youtube.com/watch?v=0i4qy-DmRqI",
        "https://www.youtube.com/watch?v=iEwQVVAkzPg",
        "https://www.youtube.com/watch?v=YAZcQ2O_QUw",
        "https://www.youtube.com/watch?v=ZEH1sXVlvYM",
        "https://www.youtube.com/watch?v=2mPq7QntIiA",
        "https://www.youtube.com/watch?v=_5NR3v60b8s",
        "https://www.youtube.com/watch?v=PDZM1vCf1Bw",
        "https://www.youtube.com/watch?v=f6YU_9F244o",
        "https://www.youtube.com/watch?v=HNOHndOR9uk",
        "https://www.youtube.com/watch?v=To6fNRuLeVg",
        "https://www.youtube.com/watch?v=i1rlHerO5t0",
        "https://www.youtube.com/watch?v=JzMIAsMrbRA",
        "https://www.youtube.com/watch?v=lwq8055_iuY",
        "https://www.youtube.com/watch?v=akXSxEpZSn8",
        "https://www.youtube.com/watch?v=uH3SyZQPsEw",
        "https://www.youtube.com/watch?v=Ktm3XXd6TeE",
        "https://www.youtube.com/watch?v=9LZesyYNJSY",
        `${interaction.user} you have found an easter egg!\nhttps://www.youtube.com/watch?v=clfziLWHBJw`,
        `${interaction.user} you have found an easter egg!\nhttps://www.youtube.com/watch?v=uNs3MkjgrDI`,
        `${interaction.user} you have found an easter egg!`,
      ]);
      currentIndex = 0;
    }

    const randomVideo = shuffledOptions[currentIndex];
    currentIndex++;

    await interaction.reply(randomVideo);
  },
};
