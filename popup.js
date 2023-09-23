document.getElementById('copyButton').addEventListener('click', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let tabId = tabs[0].id;
    chrome.scripting.executeScript({
      target: {tabId: tabId},
      func: scrapeData
    }, function(results) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }

      if (results && results[0]) {
        chrome.storage.local.set({tableData: results[0].result});
      }
    });
  });
});
  
document.getElementById('showDataButton').addEventListener('click', function() {
  chrome.storage.local.get('tableData', function(data) {
    if (data && data.tableData) {
      document.getElementById('dataDisplay').innerText = data.tableData;
    } else {
      document.getElementById('dataDisplay').innerText = "저장된 데이터가 없습니다.";
    }
  });
});


function scrapeData() {
  let data = [];
  
  // 첫 번째 형태의 테이블에서 문제 번호 추출
  let divs = document.querySelectorAll("body > div.wrapper > div.container.content > div.row > div");
  
  divs.forEach((div, i) => {
      let header = div.querySelector("div > table > thead > tr > th:nth-child(1)");
      
      if (header && (header.innerText === "문제" || header.innerText === "Problem")) {
          let rows = div.querySelectorAll("div > table > tbody > tr");
          
          rows.forEach(row => {
              let cell = row.querySelector("td:nth-child(1)");
              if (cell) {
                  data.push(cell.innerText.trim());
              }
          });
      }
  });

  // 두 번째 형태의 테이블에서 문제 번호 추출 (기존 방식 그대로 유지)
  let rows2 = document.querySelectorAll("body > div.wrapper > div.container.content > div > div.col-md-2 > ul:nth-child(1) > li > a");
  for(let i = 0; i < rows2.length; i++) {
      let href = rows2[i].getAttribute("href");
      if(href && href.startsWith("/problem/")) {
          let problemNumber = href.split("/")[2];
          data.push(problemNumber);
      }
  }

  if (data.length === 0) {
      // 에러 메시지 표시
      alert("Goto Workbook/Set Page\n문제집/연습 화면으로 가주세요");
  }

  return data.join('\n');
}


document.getElementById('pasteButton').addEventListener('click', function() {
  chrome.storage.local.get('tableData', function(data) {
    if (data && data.tableData) {
      let problems = data.tableData.split('\n');
      pasteAndSubmitProblems(problems);
    }
  });
});

function pasteAndSubmitProblems(problems) {
  let index = 0;

  function nextProblem() {
    if (index < problems.length) {
      let problem = problems[index++];
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          func: pasteAndSubmit,
          args: [problem]
        }, nextProblem);
      });
    }
  }

  nextProblem();  // 첫 번째 문제 시작
}

// old
// function pasteAndSubmitProblems(problems) {
//   let index = 0;
//   function nextProblem() {
//     if (index < problems.length) {
//       let problem = problems[index++];
//       chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//         chrome.scripting.executeScript({
//           target: {tabId: tabs[0].id},
//           func: pasteAndSubmit,
//           args: [problem]
//         }, () => {
//           setTimeout(nextProblem, 500);  // 500ms 지연
//         });
//       });
//     }
//   }
//   nextProblem();  // 첫 번째 문제 시작
// }

function pasteAndSubmit(problem) {
  // 두 형태의 입력 폼을 대상으로 쿼리
  let input1 = document.querySelector("#problem-search");
  let input2 = document.querySelector("input[name='problem']");

  let input = input1 || input2;  // 둘 중 하나가 존재하는 경우 해당 입력 폼을 사용

  if (input) {
    input.value = problem;
    input.focus();

    let enterEvent = new KeyboardEvent('keypress', {
      'key': 'Enter',
      'code': 'Enter',
      'which': 13,
      'keyCode': 13,
      'bubbles': true,
      'cancelable': true
    });
    
    input.dispatchEvent(enterEvent);
  } else {
    alert("Goto Workbook/Set Generating Page\n문제집/연습 만들기 화면으로 가주세요");  // 에러 메시지 표시
  }
}