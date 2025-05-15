# simple-k8s-insights Helm Chart

Helm chart to deploy the simple-k8s-insights application.

## Install

```bash
helm install my-release ./simple-k8s-insights
````
## Values

| Key                     | Type   | Default                      | Description             |
| ----------------------- | ------ | ---------------------------- | ----------------------- |
| `replicaCount`          | int    | `1`                          | Number of replicas      |
| `image.repository`      | string | `yikang/simple-k8s-insights` | Image repository        |
| `service.type`          | string | `ClusterIP`                  | Kubernetes Service type |
| `ingress.enabled`       | bool   | `false`                      | Enable ingress          |
| `rbac.create`           | bool   | `true`                       | Enable RBAC             |
| `serviceAccount.create` | bool   | `true`                       | Create ServiceAccount   |