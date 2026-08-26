# Modelo MediaPipe Face Detector

Este diretório armazena o modelo binário do MediaPipe utilizado pelo componente de câmera no navegador:

* **Arquivo**: `blaze_face_short_range.tflite`
* **Tecnologia**: Google MediaPipe Vision Tasks (`FaceDetector`)
* **Finalidade**: Detecção client-side ultra-leve de rostos no navegador (posição, bounding box e área para identificação do maior rosto).

## Origem do Modelo
O modelo é distribuído oficialmente pelo Google:
`https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`

O frontend carrega o arquivo localmente através de `/models/blaze_face_short_range.tflite` com fallback automático via CDN caso o arquivo estático não seja acessível.
