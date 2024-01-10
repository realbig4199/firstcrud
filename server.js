// express 라이브러리를 사용하겠음
const express = require("express");
const app = express();

const bcrypt = require("bcrypt");
require("dotenv").config();

// public 폴더를 서버에 등록 (보통 css, jpg와 같은 static 파일 저장)
app.use(express.static(__dirname + "/public"));
// 응답.sendFile(__driname + '/index.html')
// ejs 셋팅
app.set("view engine", "ejs");
// 클라이언트의 요청으로 부터 데이터(body)를 수신하고 처리하기 위해서
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");

app.use(passport.initialize());
app.use(
  session({
    secret: "암호화에 쓸 비번",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }, // ms 기준이며 1시간으로 설정
    store: MongoStore.create({
      mongoUrl: "mongodb+srv://admim:rlawlsxo13@cluster0.j36zitd.mongodb.net/?retryWrites=true&w=majority",
      dbName: "forum",
    }),
  })
);
app.use(passport.session());

// Mongdb 연결 라이브러리 + ObjectId
const { MongoClient, ObjectId } = require("mongodb");

let db;
const url = process.env.DB_URL;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
    // 8080 포트 오픈
    app.listen(process.env.PORT, () => {
      console.timeLog("http://localhost:8080 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

function checkLogin(요청, 응답, next) {
  if (!요청.user) {
    응답.send("로그인하세요.");
  }
  next(); // 이게 없으면 무한 대기 상태
}

// "/"이라는 url 오픈
// "/"이라는 url로 get 요청이 들어올 경우 (url + method)
app.get("/", (요청, 응답) => {
  응답.render("login.ejs");
});

// __dirname : 현재 폴더의 절대 경로
app.get("/news", () => {
  db.collection("post").insertOne({ title: "어쩌구" });
});

//db의 어떤 collection에 있던 document 가져오기
app.get("/list", checkLogin, async (요청, 응답) => {
  let result = await db.collection("post").find().toArray();
  응답.render("list.ejs", { 글목록: result }); // 서버 사이드 렌더링
});

app.get("/time", (요청, 응답) => {
  응답.render("time.ejs", { time: new Date() });
});

app.get("/write", checkLogin, (요청, 응답) => {
  응답.render("write.ejs", { user: 요청.user });
});

app.post("/add", async (요청, 응답) => {
  // try - catch와 if문으로 유효성 검사 필수 (db에 저장하기 전에)
  try {
    // body에 데이터들이 실려옴
    if (요청.body.title.trim() == "" || 요청.body.content.trim() == "") {
      // 응답.send("제목 또는 내용을 입력하세요.");
      응답.send("<script>alert('제목과 내용을 모두 입력해주세요.');location.href='/write';</script>");
    } else {
      // 현재 로그인한 사용자의 ID
      const userId = 요청.user.id;

      await db.collection("post").insertOne({ title: 요청.body.title, content: 요청.body.content, user: userId });
      응답.redirect("/list"); // /list url로 이동 (redirect)
    }
  } catch (e) {
    // 500 : 서버 잘못으로 인한 에러를 의미
    응답.status(500).send("서버 에러 발생");
  }
});

// 404 오류가 똑바로 안뜸
// app.get("/detail/:id", async (요청, 응답) => {
//   const id = 요청.params.id; // URL에서 aaaa 값을 가져옵니다.

//   try {
//     // ObjectId를 사용하여 데이터베이스에서 문서를 찾습니다.
//     const document = await db.collection("post").findOne({ _id: new ObjectId(id) });

//     if (document) {
//       응답.render("detail.ejs", { document }); // 문서를 찾았다면 detail.ejs에 전달합니다.
//     } else {
//       응답.status(404).send("문서를 찾을 수 없습니다."); // 문서를 찾지 못했다면 404 오류를 보냅니다.
//     }
//   } catch (e) {
//     응답.status(500).send("서버 오류: " + e.message); // 오류 처리
//   }
// });

app.get("/detail/:id", async (요청, 응답) => {
  const id = 요청.params.id; // params를 활용하면 유저가 파라미터로 전달한 것을 가져옴

  // 먼저 id가 유효한 ObjectId인지 확인합니다.
  if (!ObjectId.isValid(id)) {
    // return 응답.status(404).send("유효하지 않은 접근입니다."); // 유효하지 않으면 404 오류를 반환합니다.
    return 응답.send("<script>alert('유효하지 않은 접근입니다.');location.href='/list';</script>");
  }

  try {
    // ObjectId를 사용하여 데이터베이스에서 문서를 찾습니다.
    const document = await db.collection("post").findOne({ _id: new ObjectId(id) });

    if (document) {
      응답.render("detail.ejs", { document }); // 문서를 찾았다면 detail.ejs에 전달합니다.
    } else {
      //응답.status(404).send("유효하지 않은 접근입니다."); // 문서를 찾지 못했다면 404 오류를 보냅니다.
      return 응답.send("<script>alert('유효하지 않은 접근입니다.');location.href='/list';</script>");
    }
  } catch (e) {
    // 여기서 발생하는 오류는 서버 오류일 가능성이 높으므로,
    // 사용자에게 500 오류 메시지를 반환합니다. (400번대는 유저 문제, 500번대는 서버 문제)
    응답.status(500).send(e.message);
  }
});

// URL 파라미터를 쓰면 비슷한 URL의 API 여러개 필요 없음
// edit 페이지 렌더링
app.get("/edit/:id", async (요청, 응답) => {
  const id = 요청.params.id;
  const document = await db.collection("post").findOne({ _id: new ObjectId(id) });
  응답.render("edit.ejs", { document });
});

// edit 페이지에서 실질적으로 edit 수행(form 박스에서 수정 버튼 누르면)
app.post("/edit/:id", async (요청, 응답) => {
  const id = 요청.params.id;
  // console.log(요청.body);
  const { title, content } = 요청.body;
  await db.collection("post").updateOne({ _id: new ObjectId(id) }, { $set: { title: title, content: content } });
  응답.redirect("/list");
});

app.delete("/doc", async (요청, 응답) => {
  await db.collection("post").deleteOne({ _id: new ObjectId(요청.query.docid) }); // 쿼리 스트링 활용
  응답.send("삭제완료");
});

// // 개수 별로 찾는 버튼
// app.get("/list/:id", async (요청, 응답) => {
//   // 1번 ~ 5번글을 찾아서 result 변수에 저장
//   let result = await db
//     .collection("post")
//     .find()
//     .skip((요청.params.id - 1) * 5)
//     .limit(5)
//     .toArray();
//   응답.render("list.ejs", { 글목록: result });
// });

// '/list/:id' 경로에 대한 GET 요청을 처리
app.get("/list/:id", async (요청, 응답) => {
  let page = parseInt(요청.params.id);
  let skipAmount = (page - 1) * 5;

  let result = await db.collection("post").find().skip(skipAmount).limit(5).toArray();

  응답.render("list.ejs", { 글목록: result });
});

// 제출한 아이디와 비밀번호가 db와 일치하는 지 검사
passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection("user").findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }

    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async (user, done) => {
  let result = await db.collection("user").findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    return done(null, result);
  });
});

app.get("/login", async (요청, 응답) => {
  응답.render("login.ejs");
});

app.post("/login", async (요청, 응답, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(401).json(info.message);
    요청.logIn(user, (err) => {
      if (err) return next(err);
      응답.redirect("/list");
    });
  })(요청, 응답, next);
});

app.get("/register", (요청, 응답) => {
  응답.render("register.ejs");
});

app.post("/register", async (요청, 응답) => {
  let 해시 = await bcrypt.hash(요청.body.password, 10);

  await db.collection("user").insertOne({ username: 요청.body.username, password: 해시 });
  응답.redirect("/");
});
