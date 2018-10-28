# first run: CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .
FROM busybox

ADD main ./

EXPOSE 2449/udp
CMD ["/main"]
