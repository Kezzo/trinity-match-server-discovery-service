$(aws ecr get-login --no-include-email --region eu-west-1)
docker build -t dev-trinity-match-server-discovery-service-registry .
docker tag dev-trinity-match-server-discovery-service-registry:latest 524454272832.dkr.ecr.eu-west-1.amazonaws.com/dev-trinity-match-server-discovery-service-registry:latest
docker push 524454272832.dkr.ecr.eu-west-1.amazonaws.com/dev-trinity-match-server-discovery-service-registry:latest

aws ecs update-service --cluster dev-trinity-match-server-cluster --service dev-trinity-match-server-discovery-service --force-new-deployment
