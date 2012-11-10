function test2(counter) {
    var d = {a: 1, b: 2, c: { d: 5, e: [1,2,3]}};
    
    var a = 1;
    console.log("Counter: ", counter);
}

function test1(counter) {
    test2(counter);
}

process.foo = "foooo!!!";
process.bar = [1,2,3,4];
process.baz = { a: 2, b: 3};
process.foobar = { a: { b: [1,2], c: 3}};
console.log(process.foo);
var counter = 0;
setInterval(function() {
    test1(counter++);
}, 1000);
